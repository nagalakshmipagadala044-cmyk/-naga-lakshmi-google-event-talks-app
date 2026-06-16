import time
import re
import html
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

CACHE_DURATION = 300  # 5 minutes in-memory cache
cached_data = None
last_fetch_time = 0

def clean_html_for_tweet(html_str):
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', html_str)
    # Unescape HTML entities
    text = html.unescape(text)
    # Normalize spacing
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_entry_content(html_content):
    # Match <h3>Type</h3> followed by all content up to the next <h3> or end
    pattern = r'<h3>(.*?)</h3>(.*?)(?=\s*<h3>|$)'
    matches = re.findall(pattern, html_content, re.DOTALL)
    
    notes = []
    for match in matches:
        note_type = match[0].strip()
        note_html = match[1].strip()
        notes.append({
            'type': note_type,
            'html': note_html,
            'text': clean_html_for_tweet(note_html)
        })
    return notes

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    
    # Parse XML
    root = ET.fromstring(response.content)
    
    # Atom namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        title_text = title.text if title is not None else ""
        
        updated = entry.find('atom:updated', ns)
        updated_text = updated.text if updated is not None else ""
        
        entry_id = entry.find('atom:id', ns)
        entry_id_text = entry_id.text if entry_id is not None else ""
        
        # Link alternate
        link_href = ""
        for link in entry.findall('atom:link', ns):
            if link.attrib.get('rel') == 'alternate':
                link_href = link.attrib.get('href', '')
                break
        if not link_href:
            link = entry.find('atom:link', ns)
            if link is not None:
                link_href = link.attrib.get('href', '')
        
        content = entry.find('atom:content', ns)
        content_html = content.text if content is not None else ""
        
        notes = parse_entry_content(content_html)
        
        entries.append({
            'id': entry_id_text,
            'date': title_text,
            'updated': updated_text,
            'link': link_href,
            'notes': notes
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    global cached_data, last_fetch_time
    
    # Check if forcing refresh
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    current_time = time.time()
    
    if force_refresh or cached_data is None or (current_time - last_fetch_time) > CACHE_DURATION:
        try:
            cached_data = fetch_and_parse_feed()
            last_fetch_time = current_time
        except Exception as e:
            # If fetch fails and we have cached data, return cached data with warning
            if cached_data is not None:
                return jsonify({
                    'data': cached_data,
                    'warning': 'Failed to fetch new data. Showing cached release notes.',
                    'error': str(e)
                })
            else:
                return jsonify({'error': str(e)}), 500
                
    return jsonify({
        'data': cached_data,
        'cached_at': last_fetch_time
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
