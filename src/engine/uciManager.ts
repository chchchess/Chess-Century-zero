import type { BotProfile } from '../types/chess';

const DB_NAME = 'SepramChessEnginesDB';
const STORE_NAME = 'engines';

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    if (!window.indexedDB) {
      rej(new Error('IndexedDB tidak tersedia'));
      return;
    }
    const to = setTimeout(() => rej(new Error('Timeout')), 1000);
    try {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      r.onsuccess = () => {
        clearTimeout(to);
        res(r.result);
      };
      r.onerror = () => {
        clearTimeout(to);
        rej(r.error);
      };
    } catch (e) {
      clearTimeout(to);
      rej(e);
    }
  });
}

export async function dbGetAllEngines(): Promise<BotProfile[]> {
  try {
    const db = await openDB();
    return await new Promise((res, rej) => {
      const q = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll();
      q.onsuccess = () => res((q.result as BotProfile[]) || []);
      q.onerror = () => rej(q.error);
    });
  } catch {
    return [];
  }
}

export async function dbPutEngine(engine: BotProfile): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const q = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(engine);
      q.onsuccess = () => res();
      q.onerror = () => rej(q.error);
    });
  } catch {
    // Ignore storage errors in restricted environments
  }
}

export async function dbDeleteEngine(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const q = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).delete(id);
      q.onsuccess = () => res();
      q.onerror = () => rej(q.error);
    });
  } catch {
    // Ignore storage errors
  }
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildUciBridgeScript(): string {
  return [
    '#!/usr/bin/env python3',
    'import sys,socket,threading,subprocess,hashlib,base64,struct',
    'HOST,PORT,MAGIC="0.0.0.0",8765,"258EAFA5-E914-47DA-95CA-C5AB0DC85B11"',
    'if len(sys.argv)<2:sys.exit("Pakai: python uci_bridge.py komodo.exe")',
    'ENG=sys.argv[1]',
    'def tx(c,l,t):',
    ' d=t.encode();h=bytearray([0x81])',
    ' if len(d)<=125:h.append(len(d))',
    ' elif len(d)<=65535:h.append(126);h.extend(struct.pack("!H",len(d)))',
    ' else:h.append(127);h.extend(struct.pack("!Q",len(d)))',
    ' with l:c.sendall(bytes(h)+d)',
    'def rx(c,n):',
    ' b=bytearray()',
    ' while len(b)<n:',
    '  k=c.recv(n-len(b))',
    '  if not k:return None',
    '  b.extend(k)',
    ' return bytes(b)',
    'def rd(c):',
    ' h=rx(c,2)',
    ' if not h or (h[0]&15)==8:return None',
    ' m,ln=h[1]&128,h[1]&127',
    ' if ln==126:ln=struct.unpack("!H",rx(c,2))[0]',
    ' elif ln==127:ln=struct.unpack("!Q",rx(c,8))[0]',
    ' mk=rx(c,4) if m else b""',
    ' pl=rx(c,ln)',
    ' if pl is None:return None',
    ' return (bytes(x^mk[i%4] for i,x in enumerate(pl)) if m else pl).decode(errors="ignore")',
    'def cl(c):',
    ' req=c.recv(4096).decode(errors="ignore")',
    ' key=[l.split(":",1)[1].strip() for l in req.splitlines() if l.lower().startswith("sec-websocket-key:")][0]',
    ' acc=base64.b64encode(hashlib.sha1((key+MAGIC).encode()).digest()).decode()',
    ' c.sendall(("HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: "+acc+"\\r\\n\\r\\n").encode())',
    ' p=subprocess.Popen([ENG],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)',
    ' lk=threading.Lock()',
    ' threading.Thread(target=lambda:[tx(c,lk,x.rstrip()) for x in p.stdout],daemon=True).start()',
    ' try:',
    '  while (ms:=rd(c)) is not None:p.stdin.write(ms+"\\n");p.stdin.flush()',
    ' finally:p.terminate();c.close()',
    's=socket.socket();s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1);s.bind((HOST,PORT));s.listen(5)',
    'print("Bridge aktif di",PORT)',
    'while True:threading.Thread(target=cl,args=(s.accept()[0],),daemon=True).start()',
  ].join('\n');
}
