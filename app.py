import html
import os
import sqlite3
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "app.db")


def get_connection():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_connection()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS areas (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS assignees (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS service_requests (
          id TEXT PRIMARY KEY,
          request_no TEXT UNIQUE NOT NULL,
          customer_name TEXT NOT NULL,
          phone TEXT NOT NULL,
          area_id TEXT NOT NULL REFERENCES areas(id),
          assignee_id TEXT NOT NULL REFERENCES assignees(id),
          area_code TEXT NOT NULL,
          area_name TEXT NOT NULL,
          assignee_code TEXT NOT NULL,
          assignee_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'NEW',
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
    )

    conn.execute(
        """
        INSERT OR IGNORE INTO areas (id, code, name)
        VALUES (?, ?, ?), (?, ?, ?)
        """,
        (
            "11111111-1111-1111-1111-111111111111",
            "AREA_1",
            "พื้นที่ 1",
            "22222222-2222-2222-2222-222222222222",
            "AREA_2",
            "พื้นที่ 2",
        ),
    )

    conn.execute(
        """
        INSERT OR IGNORE INTO assignees (id, code, name, is_active)
        VALUES (?, ?, ?, 1), (?, ?, ?, 1)
        """,
        (
            "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "STAFF_A",
            "นาย A",
            "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "STAFF_B",
            "นาย B",
        ),
    )
    conn.commit()
    conn.close()


def html_page(title, body):
    return f"""<!DOCTYPE html>
<html lang=\"th\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />
  <title>{title}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 24px; color: #222; }}
    a {{ color: #0d6efd; text-decoration: none; }}
    table {{ border-collapse: collapse; width: 100%; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
    th {{ background: #f7f7f7; }}
    .btn {{ display: inline-block; background: #0d6efd; color: #fff; padding: 10px 14px; border-radius: 6px; border: none; cursor: pointer; }}
    .btn-ghost {{ background: #efefef; color: #222; }}
    .cards {{ display: flex; gap: 12px; margin: 16px 0; }}
    .card {{ border: 1px solid #ddd; border-radius: 8px; padding: 12px; min-width: 160px; }}
    .field {{ margin-bottom: 14px; }}
    label {{ display: block; margin-bottom: 6px; }}
    input, select {{ width: 100%; max-width: 560px; padding: 8px; border: 1px solid #ccc; border-radius: 6px; }}
    .hint {{ color: #666; font-size: 14px; min-height: 20px; margin-top: 4px; }}
    .errors {{ background: #ffeaea; border: 1px solid #ffb3b3; border-radius: 8px; padding: 10px; margin-bottom: 14px; }}
    .row {{ display: grid; grid-template-columns: 180px 1fr; border-bottom: 1px solid #eee; padding: 8px 0; }}
  </style>
</head>
<body>{body}</body>
</html>"""


def generate_request_no(conn):
    row = conn.execute(
        "SELECT COALESCE(MAX(CAST(SUBSTR(request_no, 5) AS INTEGER)), 0) AS seq FROM service_requests"
    ).fetchone()
    next_seq = row["seq"] + 1
    return f"REQ-{next_seq:05d}"


class AppHandler(BaseHTTPRequestHandler):
    def send_html(self, content, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(content.encode("utf-8"))

    def redirect(self, location):
        self.send_response(302)
        self.send_header("Location", location)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            return self.redirect("/dashboard")
        if parsed.path == "/dashboard":
            return self.render_dashboard()
        if parsed.path == "/requests/new":
            return self.render_new_form()
        if parsed.path.startswith("/requests/"):
            request_id = parsed.path.split("/requests/")[-1]
            return self.render_detail(request_id)
        return self.send_html(html_page("Not Found", "<h1>404 Not Found</h1>"), status=404)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/requests":
            return self.create_request()
        return self.send_html(html_page("Not Found", "<h1>404 Not Found</h1>"), status=404)

    def render_dashboard(self):
        conn = get_connection()
        requests = conn.execute(
            """
            SELECT id, request_no, customer_name, phone, area_name, assignee_name, status, created_at
            FROM service_requests
            ORDER BY created_at DESC, request_no DESC
            """
        ).fetchall()
        summary = conn.execute(
            """
            SELECT
              COUNT(*) AS total_count,
              SUM(CASE WHEN status = 'NEW' THEN 1 ELSE 0 END) AS new_count
            FROM service_requests
            """
        ).fetchone()
        conn.close()

        rows = "".join(
            f"""
            <tr>
              <td><a href='/requests/{r['id']}'>{html.escape(r['request_no'])}</a></td>
              <td>{html.escape(r['customer_name'])}</td>
              <td>{html.escape(r['phone'])}</td>
              <td>{html.escape(r['area_name'])}</td>
              <td>{html.escape(r['assignee_name'])}</td>
              <td>{html.escape(r['status'])}</td>
              <td>{html.escape(r['created_at'])}</td>
            </tr>
            """
            for r in requests
        )
        if not rows:
            rows = "<tr><td colspan='7'>ยังไม่มีคำร้อง</td></tr>"

        body = f"""
        <h1>Dashboard คำร้องผู้ใช้ไฟฟ้า</h1>
        <p><a class='btn' href='/requests/new'>+ สร้างคำร้องใหม่</a></p>
        <div class='cards'>
          <div class='card'><div>คำร้องทั้งหมด</div><strong>{summary['total_count']}</strong></div>
          <div class='card'><div>คำร้องสถานะ NEW</div><strong>{summary['new_count'] or 0}</strong></div>
        </div>
        <table>
          <thead>
            <tr><th>request_no</th><th>customer_name</th><th>phone</th><th>area_name</th><th>assignee_name</th><th>status</th><th>created_at</th></tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        """
        self.send_html(html_page("Dashboard", body))

    def render_new_form(self, errors=None, form=None):
        errors = errors or []
        form = form or {"customer_name": "", "phone": "", "area_id": "", "assignee_id": ""}

        conn = get_connection()
        areas = conn.execute("SELECT id, name FROM areas ORDER BY code").fetchall()
        assignees = conn.execute(
            "SELECT id, name FROM assignees WHERE is_active = 1 ORDER BY code"
        ).fetchall()
        conn.close()

        err_html = ""
        if errors:
            items = "".join([f"<li>{html.escape(e)}</li>" for e in errors])
            err_html = f"<div class='errors'><ul>{items}</ul></div>"

        area_options = "<option value=''>-- กรุณาเลือกพื้นที่ --</option>" + "".join(
            [
                f"<option value='{a['id']}' {'selected' if form['area_id']==a['id'] else ''}>{html.escape(a['name'])}</option>"
                for a in areas
            ]
        )
        assignee_options = "<option value=''>-- กรุณาเลือกผู้รับผิดชอบ --</option>" + "".join(
            [
                f"<option value='{a['id']}' {'selected' if form['assignee_id']==a['id'] else ''}>{html.escape(a['name'])}</option>"
                for a in assignees
            ]
        )

        body = f"""
        <h1>สร้างคำร้องใหม่</h1>
        <p>กรอกข้อมูลและเลือกพื้นที่/ผู้รับผิดชอบได้อย่างอิสระ</p>
        {err_html}
        <form method='POST' action='/requests'>
          <div class='field'>
            <label>ชื่อลูกค้า</label>
            <input name='customer_name' value='{html.escape(form['customer_name'])}' />
          </div>
          <div class='field'>
            <label>เบอร์โทร</label>
            <input name='phone' value='{html.escape(form['phone'])}' />
          </div>
          <div class='field'>
            <label>พื้นที่</label>
            <select id='area_id' name='area_id'>{area_options}</select>
            <div id='area_hint' class='hint'></div>
          </div>
          <div class='field'>
            <label>ผู้รับผิดชอบ</label>
            <select id='assignee_id' name='assignee_id'>{assignee_options}</select>
            <div id='assignee_hint' class='hint'></div>
          </div>
          <button class='btn' type='submit'>บันทึกคำร้อง</button>
          <a class='btn btn-ghost' href='/dashboard'>กลับหน้า Dashboard</a>
        </form>
        <script>
          const area = document.getElementById('area_id');
          const assignee = document.getElementById('assignee_id');
          const areaHint = document.getElementById('area_hint');
          const assigneeHint = document.getElementById('assignee_hint');
          function refresh() {{
            areaHint.textContent = area.value ? `พื้นที่ที่เลือก: ${{area.options[area.selectedIndex].text}}` : '';
            assigneeHint.textContent = assignee.value ? `ผู้รับผิดชอบที่เลือก: ${{assignee.options[assignee.selectedIndex].text}}` : '';
          }}
          area.addEventListener('change', refresh);
          assignee.addEventListener('change', refresh);
          refresh();
        </script>
        """
        self.send_html(html_page("Create Request", body))

    def create_request(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8")
        params = parse_qs(body)
        form = {
            "customer_name": params.get("customer_name", [""])[0].strip(),
            "phone": params.get("phone", [""])[0].strip(),
            "area_id": params.get("area_id", [""])[0].strip(),
            "assignee_id": params.get("assignee_id", [""])[0].strip(),
        }

        errors = []
        if not form["customer_name"]:
            errors.append("กรุณากรอกชื่อลูกค้า")
        if not form["phone"]:
            errors.append("กรุณากรอกเบอร์โทร")
        if not form["area_id"]:
            errors.append("กรุณาเลือกพื้นที่")
        if not form["assignee_id"]:
            errors.append("กรุณาเลือกผู้รับผิดชอบ")

        conn = get_connection()
        area = conn.execute("SELECT * FROM areas WHERE id = ?", (form["area_id"],)).fetchone()
        assignee = conn.execute(
            "SELECT * FROM assignees WHERE id = ? AND is_active = 1", (form["assignee_id"],)
        ).fetchone()

        if form["area_id"] and not area:
            errors.append("พื้นที่ไม่ถูกต้อง")
        if form["assignee_id"] and not assignee:
            errors.append("ผู้รับผิดชอบไม่ถูกต้อง")

        if errors:
            conn.close()
            return self.render_new_form(errors=errors, form=form)

        request_no = generate_request_no(conn)
        conn.execute(
            """
            INSERT INTO service_requests (
              id, request_no, customer_name, phone,
              area_id, assignee_id,
              area_code, area_name, assignee_code, assignee_name,
              status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?)
            """,
            (
                str(uuid.uuid4()),
                request_no,
                form["customer_name"],
                form["phone"],
                area["id"],
                assignee["id"],
                area["code"],
                area["name"],
                assignee["code"],
                assignee["name"],
                datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
        conn.commit()
        conn.close()
        self.redirect("/dashboard")

    def render_detail(self, request_id):
        conn = get_connection()
        record = conn.execute("SELECT * FROM service_requests WHERE id = ?", (request_id,)).fetchone()
        conn.close()

        if not record:
            return self.send_html(html_page("ไม่พบคำร้อง", "<h1>ไม่พบคำร้อง</h1>"), status=404)

        rows = "".join(
            f"<div class='row'><div><strong>{k}</strong></div><div>{html.escape(str(record[k]))}</div></div>"
            for k in record.keys()
        )
        body = f"""
        <h1>รายละเอียดคำร้อง {html.escape(record['request_no'])}</h1>
        <p><a href='/dashboard'>← กลับหน้า Dashboard</a></p>
        {rows}
        """
        self.send_html(html_page("Request Detail", body))


def run():
    init_db()
    port = int(os.environ.get("PORT", "3000"))
    server = HTTPServer(("0.0.0.0", port), AppHandler)
    print(f"MVP app running on http://localhost:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()
