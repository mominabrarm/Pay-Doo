import { useState, useEffect, FormEvent } from "react";
import { api } from "../api/paydoo";
import { getStoredUser, setAuthSession, getAuthToken } from "../api/client";
import type { AuthUser } from "../api/types";
import { PageHeader, Panel, Flash, LoadingState } from "../components/ui";
import { errorMessage } from "../hooks/useCollection";

export function AccountSettingsPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(getStoredUser<AuthUser>());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("India");

  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefMessage, setPrefMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getMe()
      .then((user) => {
        setCurrentUser(user);
        setFullName(user.full_name || "");
      })
      .catch((err) => setMessage({ kind: "error", text: errorMessage(err) }))
      .finally(() => setLoading(false));

    api.getNotificationPreferences()
      .then((prefs) => {
        setNotifyEmail(prefs.notify_email);
        setNotifyWhatsapp(prefs.notify_whatsapp);
        setWhatsappNumber(prefs.whatsapp_number || "");
      })
      .catch(() => {
        // Fallback default
      });
  }, []);

  const handleSavePreferences = async (e: FormEvent) => {
    e.preventDefault();
    setSavingPrefs(true);
    setPrefMessage(null);
    try {
      const updated = await api.updateNotificationPreferences({
        notify_email: notifyEmail,
        notify_whatsapp: notifyWhatsapp,
        whatsapp_number: whatsappNumber.trim() || undefined,
      });
      setNotifyEmail(updated.notify_email);
      setNotifyWhatsapp(updated.notify_whatsapp);
      setWhatsappNumber(updated.whatsapp_number || "");
      setPrefMessage({ kind: "success", text: "Notification preferences saved successfully." });
    } catch (err) {
      setPrefMessage({ kind: "error", text: errorMessage(err) });
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updatedUser = await api.updateProfile({
        full_name: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
      });

      setCurrentUser(updatedUser);
      const token = getAuthToken();
      if (token) {
        setAuthSession(token, updatedUser);
      }
      setMessage({ kind: "success", text: "Profile and billing details updated successfully." });
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        title="Account & Billing Profile"
        description="Manage your enterprise contact details, billing correspondence address, and subscription settings."
      />

      {message && <Flash kind={message.kind}>{message.text}</Flash>}

      {loading ? (
        <LoadingState label="Loading profile information" />
      ) : (
        <div className="two-column-wide">
          <Panel>
            <div className="panel-heading">
              <div>
                <h2>Company & Contact Details</h2>
                <p>Information used on your legal tax invoices and billing notices.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="form-grid">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Account Email (Permanent)</span>
                <input
                  type="email"
                  value={currentUser?.email || ""}
                  disabled
                  style={{ background: "#f8fafc", color: "#64748b" }}
                />
              </div>

              <div className="field">
                <span>Account Role</span>
                <input
                  type="text"
                  value={(currentUser?.role || "customer").toUpperCase()}
                  disabled
                  style={{ background: "#f8fafc", color: "#64748b" }}
                />
              </div>

              <div className="field">
                <span>Customer ID</span>
                <input
                  type="text"
                  value={currentUser?.customer_id ? `#${currentUser.customer_id}` : "Auto-Linked"}
                  disabled
                  style={{ background: "#f8fafc", color: "#64748b" }}
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Contact Person / Full Name</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe / Brightloop Finance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="field">
                <span>Phone Number</span>
                <input
                  type="tel"
                  placeholder="+91-9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="field">
                <span>Country</span>
                <input
                  type="text"
                  placeholder="India"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Billing Address</span>
                <input
                  type="text"
                  placeholder="Tower 4, Business Park, Tech Zone"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="field">
                <span>City / State</span>
                <input
                  type="text"
                  placeholder="Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="button" disabled={saving}>
                  {saving ? "Saving Changes…" : "Save Profile Details"}
                </button>
              </div>
            </form>
          </Panel>

          <Panel>
            <div className="panel-heading">
              <div>
                <h2>Notification Preferences</h2>
                <p>Configure automated email and WhatsApp alerts for new invoices and payment confirmations.</p>
              </div>
            </div>

            {prefMessage && <Flash kind={prefMessage.kind}>{prefMessage.text}</Flash>}

            <form onSubmit={handleSavePreferences} className="form-grid">
              <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: "12px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    disabled={savingPrefs}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <span>
                    <strong>Email Invoices & Receipts (Resend)</strong>
                    <span style={{ display: "block", fontSize: "12px", color: "#64748b" }}>
                      Receive official PDF invoices as email attachments and payment receipts instantly.
                    </span>
                  </span>
                </label>

                <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />

                <label style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifyWhatsapp}
                    onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                    disabled={savingPrefs}
                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <span>
                    <strong>WhatsApp Billing Alerts (Twilio)</strong>
                    <span style={{ display: "block", fontSize: "12px", color: "#64748b" }}>
                      Receive instant WhatsApp notifications with secure, time-limited 72-hour PDF download links.
                    </span>
                  </span>
                </label>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Dedicated WhatsApp Mobile Number (E.164)</span>
                <input
                  type="tel"
                  placeholder="+91-9876543210"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  disabled={savingPrefs}
                />
                <span className="field-note">Defaults to your contact phone number if left empty.</span>
              </div>

              <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
                <button type="submit" className="button" disabled={savingPrefs}>
                  {savingPrefs ? "Updating Preferences…" : "Save Notification Preferences"}
                </button>
              </div>
            </form>
          </Panel>

          <Panel>
            <div className="panel-heading">
              <div>
                <h2>Subscription Security</h2>
                <p>Security rules and data isolation policies.</p>
              </div>
            </div>

            <div style={{ display: "grid", gap: "14px", fontSize: "13px", color: "#475569" }}>
              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong style={{ display: "block", color: "#1e293b", marginBottom: "4px" }}>
                  Role Boundary Enforcement
                </strong>
                <span>
                  Your account is protected by strict row-level customer isolation. You can only view and manage invoices, subscriptions, and payment receipts registered to your account ID.
                </span>
              </div>

              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong style={{ display: "block", color: "#1e293b", marginBottom: "4px" }}>
                  Automated Recurring Invoicing
                </strong>
                <span>
                  Subscriptions renew on scheduled billing intervals. Invoices are generated automatically and confirmed on your renewal date with a 15-day settlement window.
                </span>
              </div>

              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <strong style={{ display: "block", color: "#1e293b", marginBottom: "4px" }}>
                  Official PDF Invoices
                </strong>
                <span>
                  All invoices generated comply with GST requirements and include digital tax breakdowns downloadable instantly via direct PDF links.
                </span>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

