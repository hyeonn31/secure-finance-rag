import csv
import json
import tempfile
import unittest
from pathlib import Path

from local_masker import LocalMasker, mask_csv


class LocalMaskerTests(unittest.TestCase):
    def test_masks_repeatable_patterns_without_retaining_raw_value(self):
        masker = LocalMasker("test-salt", {"가나다은행": "[INSTITUTION_01]"})
        source = "가나다은행 고객 홍길동 이메일 hong@example.com, 재확인 hong@example.com, 계좌 123-456-7890"
        masked = masker.mask_text(source)
        self.assertNotIn("hong@example.com", masked)
        self.assertNotIn("123-456-7890", masked)
        self.assertIn("[INSTITUTION_01]", masked)
        self.assertEqual(masked.count("[EMAIL_"), 2)
        first = masked.split("[EMAIL_")[1].split("]")[0]
        second = masked.split("[EMAIL_")[2].split("]")[0]
        self.assertEqual(first, second)

    def test_preserves_json_keys_and_masks_sensitive_fields(self):
        masker = LocalMasker("test-salt")
        payload = {"risk_grade": "A", "customer_name": "홍길동", "note": "담당자 kim@example.com"}
        masked = masker.mask_value(payload)
        self.assertEqual(set(masked.keys()), set(payload.keys()))
        self.assertNotEqual(masked["customer_name"], "홍길동")
        self.assertNotIn("kim@example.com", masked["note"])
        self.assertEqual(masked["risk_grade"], "A")

    def test_preserves_csv_headers_and_row_count(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "input.csv"
            target = Path(directory) / "output.csv"
            source.write_text("customer_name,loan_grade,contact\n홍길동,A,hong@example.com\n김철수,B,010-1234-5678\n", encoding="utf-8")
            mask_csv(source, target, LocalMasker("test-salt"))
            with target.open(encoding="utf-8", newline="") as file:
                rows = list(csv.DictReader(file))
            self.assertEqual(len(rows), 2)
            self.assertEqual(set(rows[0].keys()), {"customer_name", "loan_grade", "contact"})
            self.assertEqual(rows[0]["loan_grade"], "A")
            self.assertNotIn("홍길동", target.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
