import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail, Phone, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ClaimPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    restaurantName: "",
    ownerName: "",
    email: "",
    phone: "",
    website: "",
    message: "",
  });

  const handleChange = (
    field: keyof typeof form,
    value: string,
  ): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit: React.FormEventHandler = (event) => {
    event.preventDefault();
    // No backend yet – just show a success screen
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        {!submitted ? (
          <>
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
                    For restaurant owners
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    Claim your Blunari profile
                  </h1>
                  <p className="text-sm text-slate-300">
                    Already see your restaurant in the guide? Tell us a bit
                    more and our team will follow up to verify ownership and
                    connect your account.
                  </p>
                </div>

                <form
                  className="space-y-6"
                  onSubmit={handleSubmit}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="restaurantName">
                        Restaurant name
                      </Label>
                      <Input
                        id="restaurantName"
                        required
                        value={form.restaurantName}
                        onChange={(event) =>
                          handleChange("restaurantName", event.target.value)
                        }
                        className="border-slate-700 bg-slate-900 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerName">
                        Owner / Manager name
                      </Label>
                      <Input
                        id="ownerName"
                        required
                        value={form.ownerName}
                        onChange={(event) =>
                          handleChange("ownerName", event.target.value)
                        }
                        className="border-slate-700 bg-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={form.email}
                        onChange={(event) =>
                          handleChange("email", event.target.value)
                        }
                        className="border-slate-700 bg-slate-900 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(event) =>
                          handleChange("phone", event.target.value)
                        }
                        className="border-slate-700 bg-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">
                      Website / Instagram
                    </Label>
                    <Input
                      id="website"
                      placeholder="https:// or @handle"
                      value={form.website}
                      onChange={(event) =>
                        handleChange("website", event.target.value)
                      }
                      className="border-slate-700 bg-slate-900 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">
                      Tell us a bit more
                    </Label>
                    <Textarea
                      id="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={(event) =>
                        handleChange("message", event.target.value)
                      }
                      placeholder="Share anything that helps us verify ownership or understand your restaurant."
                      className="border-slate-700 bg-slate-900 text-sm"
                    />
                  </div>

                  <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] text-slate-500 sm:max-w-md">
                      We'll never share your contact details outside of
                      Blunari. A member of our team will email you within 1–2
                      business days.
                    </p>
                    <Button
                      type="submit"
                      className="w-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-6 text-sm font-semibold text-black shadow shadow-amber-500/40 hover:from-amber-500 hover:to-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:w-auto"
                    >
                      Submit claim
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center text-sm text-slate-300 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to guide
            </button>
            <Card className="border-emerald-600/40 bg-slate-950/80 shadow-lg shadow-emerald-500/10">
              <CardContent className="space-y-4 p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-full bg-emerald-500/15 p-2">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                      Claim request submitted
                    </h1>
                    <p className="mt-2 text-sm text-slate-300">
                      Thanks for reaching out. Our team will review your claim
                      and follow up at{" "}
                      <span className="font-medium text-emerald-300">
                        {form.email || "your email"}
                      </span>{" "}
                      within 1–2 business days.
                    </p>
                    <div className="mt-4 space-y-2 text-sm text-slate-400">
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-300" />
                        You can also email us at{" "}
                        <span className="font-medium text-slate-200">
                          hello@blunari.ai
                        </span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-300" />
                        Or call our team at{" "}
                        <span className="font-medium text-slate-200">
                          (123) 456-7890
                        </span>
                      </p>
                    </div>
                    <div className="mt-6">
                      <Button
                        type="button"
                        onClick={() => navigate("/restaurants")}
                        className="rounded-full bg-amber-500 px-6 text-sm font-semibold text-black hover:bg-amber-600"
                      >
                        Continue exploring restaurants
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClaimPage;


