"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  FileText, 
  Clock, 
  AlertTriangle 
} from "lucide-react";
import { OrganizationType } from "@/types/database";

export default function OrganizationRegistrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [submittedOrg, setSubmittedOrg] = React.useState<any | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    type: "hospital" as OrganizationType,
    registrationNumber: "",
    licenseNumber: "",
    nodalOfficerName: "",
    nodalOfficerDesignation: "Blood Bank Medical Officer",
    contactEmail: "",
    contactPhone: "",
    address: "",
    city: "Visakhapatnam",
    state: "Andhra Pradesh",
    pincode: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register organization.");
      }

      setSubmittedOrg(data.organization);
      toast.success("Organization application submitted for administrative review.");
    } catch (err: any) {
      toast.error(err.message || "Registration failed. Please check form inputs.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-800 to-red-950 text-white shadow-md shadow-red-900/20">
          <Building2 className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight">
          Healthcare Facility & Blood Centre Verification
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          Under BloodLink Trust & Safety rules, only verified hospitals, blood centres, and clinical establishments may broadcast patient blood requirements.
        </p>
      </div>

      {submittedOrg ? (
        /* SUCCESS CONFIRMATION STATE */
        <Card className="border-emerald-200 bg-emerald-50/40 max-w-2xl mx-auto p-6 text-left space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-950">Application Queued for Verification</h2>
              <p className="text-xs text-emerald-700">Reference ID: {submittedOrg.id}</p>
            </div>
          </div>

          <div className="rounded-xl bg-white border border-emerald-200 p-4 space-y-2 text-xs text-stone-800">
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-stone-500 font-medium">Facility Name:</span>
              <span className="font-bold">{submittedOrg.name}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-stone-500 font-medium">Registration Number:</span>
              <span className="font-mono font-bold">{submittedOrg.registrationNumber}</span>
            </div>
            <div className="flex justify-between border-b pb-1.5">
              <span className="text-stone-500 font-medium">Nodal Medical Officer:</span>
              <span>{submittedOrg.nodalOfficerName} ({submittedOrg.nodalOfficerDesignation})</span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-stone-500 font-medium">Current Status:</span>
              <Badge variant="warning" size="sm">Verification Pending Review</Badge>
            </div>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed">
            Our clinical verification team cross-checks facility registration against state health registry databases. You will be notified at <strong>{submittedOrg.contactEmail}</strong> once approved.
          </p>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => router.push("/search")} className="flex-1">
              Browse Voluntary Donors
            </Button>
            <Button variant="primary" onClick={() => router.push("/admin/organizations")} className="flex-1">
              Go to Admin Queue (Demo)
            </Button>
          </div>
        </Card>
      ) : (
        /* REGISTRATION FORM */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-4xl mx-auto">
          <div className="lg:col-span-8">
            <Card className="border-stone-200/90 shadow-md">
              <CardHeader className="p-5 sm:p-6 pb-4">
                <CardTitle className="text-lg font-bold text-stone-900">
                  Institutional Registration Application
                </CardTitle>
                <CardDescription className="text-xs">
                  Provide regulatory license and medical nodal officer details.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 sm:p-6 pt-0 space-y-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Official Healthcare Facility Name"
                    placeholder="e.g. King George Hospital & Blood Centre"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                        Facility Type *
                      </label>
                      <Select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as OrganizationType })}
                      >
                        <option value="hospital">Hospital / Medical College</option>
                        <option value="blood_bank">Licensed Blood Centre</option>
                        <option value="clinic">Specialty Clinic</option>
                        <option value="red_cross">Indian Red Cross Chapter</option>
                        <option value="ngo">Voluntary Health NGO</option>
                      </Select>
                    </div>

                    <Input
                      label="Clinical Registration Number"
                      placeholder="e.g. AP/VSP/2018/HOSP-8891"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Drug Controller Blood Bank License No. (If applicable)"
                      placeholder="e.g. AP-BB-042"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    />

                    <Input
                      label="PIN Code"
                      placeholder="530002"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "") })}
                      required
                    />
                  </div>

                  <div className="border-t border-stone-200 pt-3 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                      Nodal Medical Officer Responsible
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Medical Officer Name"
                        placeholder="Dr. K. S. Ramanujam, MD"
                        value={formData.nodalOfficerName}
                        onChange={(e) => setFormData({ ...formData, nodalOfficerName: e.target.value })}
                        required
                      />

                      <Input
                        label="Designation / Title"
                        placeholder="Chief Medical Officer"
                        value={formData.nodalOfficerDesignation}
                        onChange={(e) => setFormData({ ...formData, nodalOfficerDesignation: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Institutional Email Address"
                        type="email"
                        placeholder="bloodbank@hospital.gov.in"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        required
                      />

                      <Input
                        label="Facility Helpline / Phone"
                        type="tel"
                        placeholder="+91 891 2564891"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Physical Address"
                      placeholder="Collector Office Road, Maharanipeta"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                    />

                    <Input
                      label="City"
                      placeholder="Visakhapatnam"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isLoading}
                    className="w-full font-bold shadow-sm shadow-red-900/20"
                  >
                    Submit Verification Application
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Information Column */}
          <aside className="lg:col-span-4 space-y-4 text-xs">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Why We Verify Institutions
              </h3>
              <p className="text-stone-600 leading-relaxed">
                To protect voluntary blood donors from commercial exploitation, bogus urgent requests, and scam solicitations, emergency blood broadcasts are strictly restricted to vetted medical establishments.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-amber-700" />
                Verification SLA
              </h4>
              <p className="text-stone-600 leading-relaxed">
                Applications are reviewed within 24 to 48 hours. Government medical colleges and district hospital blood centres receive prioritized verification.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-2">
              <h4 className="font-bold text-stone-900">Already Registered?</h4>
              <p className="text-stone-600">
                Log in to broadcast urgent blood requests or check your application review status.
              </p>
              <Link href="/login" className="text-red-800 hover:text-red-950 font-bold inline-flex items-center gap-1 pt-1">
                Sign In <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
