"use client";

import { useEffect, useMemo, useState } from "react";
import PatientChart from "../../components/provider/PatientChart";
import PatientList from "../../components/provider/PatientList";
import ChatInterface from "../../components/ChatInterface";

type PatientRecord = {
  id: string;
  patientId?: string;
  full_name?: string;
  name?: string;
  age?: number;
  gender?: string;
  dob?: string;
  chiefComplaint?: string;
  allergies?: string[];
  history?: string[];
  medicalHistory?: string[];
  surgicalHistory?: string[];
  vitals?: {
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    oxygen_saturation?: number;
  };
  medications?: Array<
    | string
    | {
        name?: string;
        dose?: string;
        frequency?: string;
      }
  >;
};

export default function ProviderDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null
  );
  const [activePatient, setActivePatient] = useState<PatientRecord | null>(
    null
  );
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  useEffect(() => {
    const fetchPatient = async () => {
      if (!selectedPatientId) {
        setActivePatient(null);
        return;
      }
      setIsLoadingPatient(true);
      try {
        const response = await fetch(`/api/patients?id=${selectedPatientId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch patient");
        }
        const data = (await response.json()) as { patient: PatientRecord | null };
        setActivePatient(data.patient ?? null);
      } catch (error) {
        setActivePatient(null);
      } finally {
        setIsLoadingPatient(false);
      }
    };

    void fetchPatient();
  }, [selectedPatientId]);

  const patientContext = useMemo(() => {
    if (!activePatient) return null;
    return JSON.stringify(activePatient, null, 2);
  }, [activePatient]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div
          className={
            isChatExpanded ? "flex flex-col gap-4" : "grid gap-6 lg:grid-cols-[280px_1fr_360px]"
          }
        >
          <div className={isChatExpanded ? "hidden" : "block"}>
            <PatientList
              selectedPatientId={selectedPatientId}
              onSelect={(patientId) => setSelectedPatientId(patientId)}
            />
          </div>
          <div className={isChatExpanded ? "hidden" : "flex flex-col gap-4"}>
            {isLoadingPatient && (
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                Loading chart...
              </div>
            )}
            <PatientChart patient={activePatient} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 text-sm text-slate-600 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                  AI Copilot
                </p>
                <button
                  type="button"
                  onClick={() => setIsChatExpanded((prev) => !prev)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:border-brand/60"
                >
                  {isChatExpanded ? "Collapse" : "Expand"}
                </button>
              </div>
              <p className="mt-2 text-sm">
                {activePatient
                  ? `Focused on ${activePatient.full_name ?? activePatient.name ?? "active patient"}.`
                  : "Select a patient to focus the conversation."}
              </p>
            </div>
            <ChatInterface
              mode="provider"
              patientContext={patientContext}
              patientId={selectedPatientId}
              onPatientUpdate={(patient) =>
                setActivePatient(patient as PatientRecord)
              }
            />
          </div>
        </div>
      </div>
    </main>
  );
}
