import React from "react";
import AdminLayout from "../components/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) navigate("/admin-panel");
  }, [user, navigate]);

  return (
    <AdminLayout title="Account Settings">
      <div className="container py-4" style={{ maxWidth: "800px" }}>
        <div className="card shadow-sm">
          <div className="card-body">
            <h5 className="mb-3">Account Settings</h5>
            <p className="text-muted mb-0">
              This section is reserved for account-level settings (e.g., security, multi-factor auth). Please reach out to support if you need changes.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AccountSettings;


