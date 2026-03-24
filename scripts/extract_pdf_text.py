import json
import sys
from pathlib import Path

from pypdf import PdfReader


def main() -> int:
    if len(sys.argv) < 2:
      print(json.dumps({
          "ok": False,
          "error": "Missing PDF path",
          "text": ""
      }))
      return 1

    pdf_path = Path(sys.argv[1])

    try:
        reader = PdfReader(str(pdf_path))
        page_texts = []

        for page in reader.pages:
            text = page.extract_text() or ""
            page_texts.append(text)

        full_text = "\n\n".join(page_texts)

        print(json.dumps({
            "ok": True,
            "error": None,
            "text": full_text
        }))
        return 0
    except Exception as exc:
        print(json.dumps({
            "ok": False,
            "error": str(exc),
            "text": ""
        }))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())