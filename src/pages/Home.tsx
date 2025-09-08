import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Shield, FileCheck, Users, BarChart3, Upload, Database, AlertTriangle } from "lucide-react";
import heroImage from "@/assets/hero-validation.jpg";

export const Home = () => {
  const features = [
    {
      icon: FileCheck,
      title: "Certificate Verification",
      description: "Upload and verify academic certificates instantly with our AI-powered validation system."
    },
    {
      icon: Shield,
      title: "Advanced Security",
      description: "Multi-layer authentication using OCR, blockchain verification, and institutional databases."
    },
    {
      icon: Users,
      title: "Institution Integration",
      description: "Seamless integration for educational institutions to upload and manage certificate records."
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Real-time monitoring of verification activity, forgery trends, and security insights."
    }
  ];

  const stats = [
    { number: "50,000+", label: "Certificates Verified" },
    { number: "200+", label: "Partner Institutions" },
    { number: "99.8%", label: "Accuracy Rate" },
    { number: "24/7", label: "System Availability" }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-hover">
        <div className="absolute inset-0 bg-black/20"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        ></div>
        
        <div className="relative container mx-auto px-4 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="heading-xl text-white mb-6">
                Academic Certificate
                <span className="block text-blue-200">Authenticity Validator</span>
              </h1>
              <p className="body-lg text-blue-100 mb-8 max-w-lg">
                Protect educational integrity with our comprehensive digital platform for 
                authenticating and verifying academic certificates across institutions.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/verify" className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Verify Certificate
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                  <Link to="/institution">
                    Institution Login
                  </Link>
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src={heroImage} 
                alt="Certificate validation system" 
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                  {stat.number}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="heading-lg text-foreground mb-4">
              Comprehensive Validation Solution
            </h2>
            <p className="body-lg text-muted-foreground max-w-3xl mx-auto">
              Our platform combines cutting-edge technology with institutional partnerships 
              to provide the most reliable certificate authentication system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="heading-lg text-white mb-6">
              Ready to Validate Certificates?
            </h2>
            <p className="body-lg text-blue-100 mb-8">
              Join hundreds of institutions and employers already using our platform 
              to ensure the authenticity of academic credentials.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" asChild>
                <Link to="/verify" className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Start Verification
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20" asChild>
                <Link to="/admin" className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Admin Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};