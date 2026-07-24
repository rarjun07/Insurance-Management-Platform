def test_openapi_generates(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/customers/" in paths
    assert "/api/v1/policies/" in paths
    assert "/api/v1/premiums/" in paths
    assert "/api/v1/claims/" in paths
    assert "/api/v1/documents/" in paths
    assert "/api/v1/reports/summary" in paths
