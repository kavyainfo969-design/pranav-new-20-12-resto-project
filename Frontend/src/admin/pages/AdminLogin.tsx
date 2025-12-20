import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaLock, FaUser } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

const AdminLogin: React.FC = () => {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login({
        username: credentials.username,
        password: credentials.password,
      });

      if (user.role === "superadmin") navigate("/admin/super-dashboard");
      else navigate("/admin/dashboard");
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white text-center">
              <h4 className="mb-0">
                <FaLock className="me-2" />
                Admin Login
              </h4>
            </div>

            <div className="card-body">
              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">
                    <FaUser className="me-2" />
                    Username
                  </label>
                  <input
                    type="text"
                    name="username"
                    className="form-control"
                    value={credentials.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    <FaLock className="me-2" />
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    value={credentials.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>

              <div className="mt-3 text-center">
                <small className="text-muted">
                  Demo credentials: admin / admin123 or superadmin / super123
                </small>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
