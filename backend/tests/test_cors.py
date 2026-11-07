import unittest

from fastapi.testclient import TestClient

from main import app


class CORSMiddlewareTests(unittest.TestCase):
    def test_localhost_demo_login_private_network_preflight_is_allowed(self):
        response = TestClient(app).options("/api/reviews", headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
            "Access-Control-Request-Private-Network": "true",
        })

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")
        self.assertIn("POST", response.headers["access-control-allow-methods"])
        allowed_headers = response.headers["access-control-allow-headers"].lower()
        self.assertIn("content-type", allowed_headers)
        self.assertEqual(response.headers["access-control-allow-private-network"], "true")
        self.assertNotIn("access-control-allow-credentials", response.headers)

    def test_unlisted_origin_is_not_allowed_for_private_network_preflight(self):
        response = TestClient(app).options("/api/reviews", headers={
            "Origin": "https://untrusted.invalid",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Private-Network": "true",
        })

        self.assertEqual(response.status_code, 400)
        self.assertNotIn("access-control-allow-origin", response.headers)


if __name__ == "__main__":
    unittest.main()
