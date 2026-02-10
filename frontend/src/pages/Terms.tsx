import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const Terms = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header variant="landing" />
      <main className="container flex-1 py-12 max-w-2xl mx-auto">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-muted-foreground mb-4">
          By using Ortrace, you agree to use the service in compliance with applicable laws and not to misuse or abuse the platform or other users’ data.
        </p>
        <p className="text-muted-foreground mb-4">
          We provide the service “as is” and reserve the right to modify, suspend, or discontinue features with reasonable notice where possible. Your use of Ortrace after changes constitutes acceptance of the updated terms.
        </p>
        <p className="text-muted-foreground">
          For questions about these terms, please contact us. Continued use of Ortrace means you accept these terms and our Privacy Policy.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
