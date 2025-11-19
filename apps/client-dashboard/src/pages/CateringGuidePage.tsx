import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CateringGuidePage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit: React.FormEventHandler = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center text-sm text-slate-300 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </button>

        <Card className="border-slate-800 bg-slate-950/80 shadow-lg">
          <CardContent className="space-y-8 p-6 md:p-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/40">
                <Sparkles className="h-3 w-3" />
                Coming soon
              </div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Blunari Catering for Atlanta
              </h1>
              <p className="text-sm text-slate-300">
                We’re building a premium catering discovery experience—think
                chef-driven menus, corporate-friendly tools, and seamless
                coordination powered by Blunari.
              </p>
            </div>

            {!submitted ? (
              <form
                className="space-y-6"
                onSubmit={handleSubmit}
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Get early access</Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      id="email"
                      required
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="border-slate-700 bg-slate-900 text-sm"
                    />
                    <Button
                      type="submit"
                      className="h-11 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-6 text-sm font-semibold text-black shadow shadow-amber-500/40 hover:from-amber-500 hover:to-amber-700"
                    >
                      Notify me
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    We’ll only email you about Blunari Catering. No spam, ever.
                  </p>
                </div>
              </form>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 text-sm text-slate-300"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                <div>
                  <p className="font-semibold">
                    You’re on the list for early access.
                  </p>
                  <p className="mt-1 text-slate-400">
                    We’ll reach out at{" "}
                    <span className="font-medium text-emerald-300">
                      {email || "your email"}
                    </span>{" "}
                    when our catering tools launch in Atlanta.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="space-y-2 text-sm text-slate-400">
              <p>
                Already using Blunari for reservations or catering? Your
                existing account will connect automatically once the consumer
                catering experience launches.
              </p>
              <p className="flex items-center gap-2 text-[11px] text-slate-500">
                <Mail className="h-3.5 w-3.5" />
                Have questions? Reach us at{" "}
                <span className="font-medium text-slate-300">
                  hello@blunari.ai
                </span>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CateringGuidePage;


