// 서버와의 WebSocket 연결
export class Net {
  constructor() {
    this.handlers = {};
    this.ws = null;
    this.onClose = null;
  }

  on(type, fn) { this.handlers[type] = fn; }

  connect(hello) {
    return new Promise((resolve, reject) => {
      const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
      const ws = new WebSocket(url);
      this.ws = ws;
      let welcomed = false;
      ws.onopen = () => ws.send(JSON.stringify(hello));
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (!welcomed) {
          if (msg.t === 'welcome') { welcomed = true; resolve(msg); return; }
          if (msg.t === 'error') { reject(new Error(msg.code || msg.message)); return; }
        }
        const h = this.handlers[msg.t];
        if (h) {
          try { h(msg); } catch (err) { console.error('메시지 처리 오류', msg.t, err); }
        }
      };
      ws.onclose = () => {
        if (!welcomed) reject(new Error('연결 실패'));
        else this.onClose?.();
      };
      ws.onerror = () => {};
    });
  }

  send(obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
  }
}
