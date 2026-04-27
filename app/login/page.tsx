import { LoginForm } from "./LoginForm";
import { t } from "@/lib/i18n";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-background via-background to-accent/40">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border bg-card shadow-sm p-8 space-y-5">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{t.login.title}</h1>
            <p className="text-sm text-muted-foreground">{t.login.descriptionPassword}</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
