import React, { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/admin-panel");
    } else {
      setForm({
        name: user.name,
        email: user.email,
        password: "",
      });
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = name === "password" ? value.replace(/\s/g, "") : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
    setMessage(null);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedPassword = form.password;

    if (!trimmedName || !trimmedEmail) {
      setError("Please fill in both name and email.");
      return;
    }

    // Name: letters and spaces, at least 2 chars
    if (!/^[A-Za-z][A-Za-z\s]{1,}$/.test(trimmedName)) {
      setError("Name must contain only letters and spaces.");
      return;
    }

    // Basic email format check
    const emailValid = /\S+@\S+\.\S+/.test(trimmedEmail);
    if (!emailValid) {
      setError("Please enter a valid email address.");
      return;
    }

    // Password validation only if provided
    if (trimmedPassword) {
      if (/\s/.test(trimmedPassword)) {
        setError("Password cannot contain spaces.");
        return;
      }
      if (trimmedPassword.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (!/[A-Z]/.test(trimmedPassword)) {
        setError("Password needs at least one uppercase letter.");
        return;
      }
      if (!/[a-z]/.test(trimmedPassword)) {
        setError("Password needs at least one lowercase letter.");
        return;
      }
      if (!/[0-9]/.test(trimmedPassword)) {
        setError("Password needs at least one number.");
        return;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(trimmedPassword)) {
        setError("Password needs at least one special character.");
        return;
      }
    }

    const updates: Partial<{ name: string; email: string; password?: string }> = {};
    if (user?.name !== trimmedName) updates.name = trimmedName;
    if (user?.email !== trimmedEmail) updates.email = trimmedEmail;
    if (trimmedPassword) updates.password = trimmedPassword;

    if (Object.keys(updates).length === 0) {
      setMessage("No changes to update.");
      return;
    }

    updateUser(updates as any);
    setMessage("Profile updated successfully.");
    setError(null);
    setForm((prev) => ({ ...prev, password: "" }));
  };

  return (
    <AdminLayout title="Profile Settings">
      <div className="container py-4" style={{ maxWidth: "800px" }}>
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Profile Settings</h5>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-danger mb-3" role="alert">
                {error}
              </div>
            )}
            {message && !error && (
              <div className="alert alert-info mb-3" role="alert">
                {message}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  name="name"
                  className="form-control"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  className="form-control"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Set a new password (demo only)"
                />
                <small className="form-text text-muted">
                  Password must be at least 8 characters and include uppercase, lowercase, number, and special
                  character. Spaces are not allowed.
                </small>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProfileSettings;


