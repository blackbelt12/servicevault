import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Camera, Trash2 } from "lucide-react";
import { db, wipeAllUserData } from "@/db";

export default function BusinessSettingsPage() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const settings = await db.settings.toArray();
      const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
      setCompanyName(map["companyName"] ?? "");
      setPhone(map["phone"] ?? "");
      setEmail(map["email"] ?? "");
      setLogo(map["logo"] ?? null);
    })();
  }, []);

  const handleSave = async () => {
    await db.settings.bulkPut([
      { key: "companyName", value: companyName },
      { key: "phone", value: phone },
      { key: "email", value: email },
      ...(logo ? [{ key: "logo", value: logo }] : []),
    ]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setLogo(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = async () => {
    setLogo(null);
    await db.settings.delete("logo");
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await wipeAllUserData();
      // Also clear onboarding so the user lands on the fresh-start flow,
      // not a blank authenticated app.
      await db.settings.clear();
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      setResetting(false);
      setConfirmReset(false);
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <button
          onClick={() => navigate("/more")}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          More
        </button>
      </div>
      <div className="px-4 pb-4">
        <h1 className="text-2xl font-bold mb-4">Business Settings</h1>

        <div className="space-y-4">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            {logo ? (
              <div className="relative">
                <img
                  src={logo}
                  alt="Logo"
                  className="h-20 w-20 rounded-xl object-cover border border-border"
                />
                <button
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground"
              >
                <Camera className="h-5 w-5" />
                <span className="text-[10px]">Add Logo</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Company Name
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Business Name"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@yourbusiness.com"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm"
          >
            {saved ? "Saved ✓" : "Save Settings"}
          </button>
        </div>

        {/* Danger zone */}
        <div className="mt-10 pt-6 border-t border-border">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Danger Zone
          </h2>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive mb-1">
              Reset all data
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Wipes every client, property, job, invoice, photo, list, and
              route on this device and sends you back to onboarding. This
              cannot be undone — export a backup first if you need one.
            </p>
            <button
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset all data
            </button>
          </div>
        </div>
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !resetting && setConfirmReset(false)}
          />
          <div className="relative bg-background rounded-2xl p-5 mx-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold">Erase everything?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Every client, property, job, invoice, photo, list, and route
              on this device will be permanently deleted. This cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium disabled:opacity-50"
              >
                {resetting ? "Erasing..." : "Erase everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
