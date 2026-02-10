import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Privacy = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="landing" />
      <main className="container flex-1 py-12 max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-muted-foreground mb-4">
          Ortrace collects and uses your information only to provide and improve our service. We do not sell your personal data.
        </p>
        <p className="text-muted-foreground mb-4">
          When you sign in or use the product, we store account and usage data necessary to deliver the service and to communicate with you. We use industry-standard security practices to protect your data.
        </p>
        <p className="text-muted-foreground">
          For questions about your data or this policy, contact us at the email address provided on our website. We may update this policy from time to time; the current version is always available on this page.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
