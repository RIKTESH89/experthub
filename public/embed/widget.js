(function() {
  'use strict';

  var script = document.currentScript;
  var apiKey = script.getAttribute('data-api-key');
  if (!apiKey) return;

  var API_BASE = script.src.replace('/embed/widget.js', '');
  var visitorId = localStorage.getItem('_tw_vid_' + apiKey) || generateId();
  localStorage.setItem('_tw_vid_' + apiKey, visitorId);
  var visitorToken = localStorage.getItem('_tw_token_' + apiKey) || '';

  function generateId() {
    return 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Fetch config
  fetch(API_BASE + '/api/widget/config?apiKey=' + apiKey)
    .then(function(r) { if (!r.ok) throw new Error('Config unavailable'); return r.json(); })
    .then(function(config) { initWidget(config); })
    .catch(function() { console.warn('Twin Widget: Failed to load config'); });

  function initWidget(config) {
    if (document.getElementById("tw-widget-btn")) return;
    // Create floating button
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open AI Twin chat');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'tw-widget-chat');
    btn.id = 'tw-widget-btn';
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    btn.style.cssText = 'position:fixed;' + (config.position === 'bottom-left' ? 'left' : 'right') + ':20px;bottom:20px;width:56px;height:56px;border:0;border-radius:50%;background:' + config.primaryColor + ';display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:999999;transition:transform 0.2s;';
    btn.onmouseover = function() { btn.style.transform = 'scale(1.1)'; };
    btn.onmouseout = function() { btn.style.transform = 'scale(1)'; };
    document.body.appendChild(btn);

    var chatOpen = false;
    var chatBox = null;
    var messages = [];
    var questionsUsed = 0;

    btn.onclick = function() {
      if (chatOpen) { closeChatBox(); } else { openChatBox(); }
    };

    function openChatBox() {
      chatOpen = true;
      btn.setAttribute('aria-expanded', 'true');
      btn.style.display = 'none';

      chatBox = document.createElement('div');
      chatBox.id = 'tw-widget-chat';
      chatBox.setAttribute('role', 'dialog');
      chatBox.setAttribute('aria-label', 'AI Twin chat');
      chatBox.addEventListener('keydown', function(e) { if (e.key === 'Escape') { e.preventDefault(); closeChatBox(); } });
      chatBox.style.cssText = 'position:fixed;' + (config.position === 'bottom-left' ? 'left' : 'right') + ':20px;bottom:20px;width:380px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);box-sizing:border-box;border-radius:16px;background:#fff;box-shadow:0 8px 30px rgba(0,0,0,0.12);z-index:999999;display:flex;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

      // Header
      var header = document.createElement('div');
      header.style.cssText = 'padding:16px;background:' + config.primaryColor + ';color:white;display:flex;align-items:center;gap:12px;';
      header.innerHTML = '<div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07l-2.83 2.83M9.76 14.24l-2.83 2.83m0-10.14l2.83 2.83m4.48 4.48l2.83 2.83"/></svg></div>' +
        '<div><div style="font-weight:600;font-size:14px;">' + (config.expertName || 'AI Twin') + '</div>' +
        '<div style="font-size:11px;opacity:0.8;">Digital Twin</div></div>' +
        '<button type="button" aria-label="Close AI Twin chat" style="margin-left:auto;cursor:pointer;padding:4px;min-width:44px;min-height:44px;border:0;background:transparent;color:inherit;font-size:24px;" id="tw-close">&times;</button>';
      chatBox.appendChild(header);

      chatBox.querySelector('#tw-close').onclick = function(e) {
        e.stopPropagation();
        closeChatBox();
      };

      // Messages area
      var msgsArea = document.createElement('div');
      msgsArea.id = 'tw-msgs';
      msgsArea.setAttribute('role', 'log');
      msgsArea.setAttribute('aria-label', 'AI Twin conversation');
      msgsArea.style.cssText = 'flex:1;min-height:0;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#f9fafb;';
      chatBox.appendChild(msgsArea);

      // Add greeting
      if (config.greeting && messages.length === 0) {
        messages.push({ role: 'assistant', content: config.greeting });
      }
      renderMessages(msgsArea);

      // Input area
      var inputArea = document.createElement('div');
      inputArea.style.cssText = 'padding:12px;border-top:1px solid #e5e7eb;display:flex;gap:8px;background:#fff;';
      inputArea.innerHTML = '<input id="tw-input" aria-label="Question for AI Twin" type="text" placeholder="Ask a question..." style="flex:1;min-width:0;padding:8px 12px;border:1px solid #e5e7eb;border-radius:8px;font-size:16px;font-family:inherit;" />' +
        '<button id="tw-send" style="padding:8px 16px;background:' + config.primaryColor + ';color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-family:inherit;">Send</button>';
      chatBox.appendChild(inputArea);

      document.body.appendChild(chatBox);

      var input = chatBox.querySelector('#tw-input');
      var sendBtn = chatBox.querySelector('#tw-send');

      sendBtn.onclick = function() { sendMessage(input, msgsArea); };
      input.onkeydown = function(e) { if (e.key === 'Enter' && !e.isComposing) sendMessage(input, msgsArea); };
      input.focus();
    }

    function closeChatBox() {
      chatOpen = false;
      if (chatBox) { chatBox.remove(); chatBox = null; }
      btn.style.display = 'flex';
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }

    function renderMessages(container) {
      container.innerHTML = '';
      messages.forEach(function(msg) {
        var div = document.createElement('div');
        div.style.cssText = 'max-width:85%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;word-wrap:break-word;' +
          (msg.role === 'user' ? 'align-self:flex-end;background:' + config.primaryColor + ';color:white;border-bottom-right-radius:4px;' : 'align-self:flex-start;background:white;color:#1f2937;border:1px solid #e5e7eb;border-bottom-left-radius:4px;');
        div.textContent = msg.content;
        container.appendChild(div);
      });
      container.scrollTop = container.scrollHeight;
    }

    function sendMessage(input, msgsArea) {
      var text = input.value.trim();
      if (!text) return;

      messages.push({ role: 'user', content: text });
      input.value = '';
      renderMessages(msgsArea);

      // Show typing indicator
      var typing = document.createElement('div');
      typing.style.cssText = 'align-self:flex-start;padding:10px 14px;border-radius:12px;background:white;border:1px solid #e5e7eb;font-size:13px;color:#9ca3af;';
      typing.textContent = 'Thinking...';
      msgsArea.appendChild(typing);
      msgsArea.scrollTop = msgsArea.scrollHeight;

      fetch(API_BASE + '/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey, visitorId: visitorId, visitorToken: visitorToken, message: text })
      }).then(function(res) {
        var issuedId = res.headers.get('X-Widget-Visitor-Id');
        var issuedToken = res.headers.get('X-Widget-Token');
        if (issuedId && issuedToken) {
          visitorId = issuedId; visitorToken = issuedToken;
          localStorage.setItem('_tw_vid_' + apiKey, visitorId);
          localStorage.setItem('_tw_token_' + apiKey, visitorToken);
        }

        if (res.status === 403) {
          return res.json().then(function(data) {
            typing.remove();
            showPaywall(msgsArea, data.subscribeUrl || '#');
            throw new Error('limit_reached');
          });
        }
        if (!res.ok) throw new Error('Failed');

        // Handle streaming response
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var fullContent = '';
        messages.push({ role: 'assistant', content: '' });
        typing.remove();
        questionsUsed++;

        function read() {
          reader.read().then(function(result) {
            if (result.done) { renderMessages(msgsArea); return; }
            var chunk = decoder.decode(result.value, { stream: true });
            var lines = chunk.split('\n');
            for (var i = 0; i < lines.length; i++) {
              if (lines[i].startsWith('data: ')) {
                var data = lines[i].slice(6);
                if (data === '[DONE]') continue;
                try {
                  var parsed = JSON.parse(data);
                  if (parsed.content) {
                    fullContent += parsed.content;
                    messages[messages.length - 1].content = fullContent;
                    renderMessages(msgsArea);
                  }
                } catch(e) {}
              }
            }
            read();
          });
        }
        read();
      }).catch(function(err) {
        if (err.message !== 'limit_reached') {
          typing.remove();
          messages.push({ role: 'assistant', content: 'Sorry, something went wrong. Please try again.' });
          renderMessages(msgsArea);
        }
      });
    }

    function showPaywall(container, url) {
      var wall = document.createElement('div');
      wall.style.cssText = 'padding:20px;text-align:center;background:white;border-radius:12px;border:1px solid #e5e7eb;margin-top:8px;';
      wall.innerHTML = '<div style="font-size:24px;margin-bottom:8px;">&#128274;</div>' +
        '<div style="font-weight:600;font-size:14px;color:#1f2937;">Free questions used up</div>' +
        '<div style="font-size:12px;color:#6b7280;margin:8px 0;">Subscribe for unlimited access to this expert\'s Digital Twin.</div>' +
        '<a href="' + API_BASE + url + '" target="_blank" style="display:inline-block;padding:8px 20px;background:' + config.primaryColor + ';color:white;border-radius:8px;text-decoration:none;font-size:13px;font-weight:500;">Subscribe Now</a>';
      container.appendChild(wall);
      container.scrollTop = container.scrollHeight;
    }
  }
})();
