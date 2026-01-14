"use client";

import { useMemo, useState } from "react";

type VitalSigns = {
  blood_pressure?: string;
  heart_rate?: number;
  temperature?: number;
  oxygen_saturation?: number;
};

type Medication =
  | string
  | {
      name?: string;
      dose?: string;
      frequency?: string;
    };

type PatientRecord = {
  id: string;
  patientId?: string;
  full_name?: string;
  name?: string;
  age?: number;
  gender?: string;
  dob?: string;
  chiefComplaint?: string;
  chief_complaint?: string;
  allergies?: string[];
  history?: string[];
  medicalHistory?: string[];
  surgicalHistory?: string[];
  history_of_present_illness?: string;
  vitals?: VitalSigns;
  medications?: Medication[];
};

type PatientChartProps = {
  patient: PatientRecord | null;
};

const tabs = ["Overview", "Clinical Data", "History"] as const;
type Tab = (typeof tabs)[number];

export default function PatientChart({ patient }: PatientChartProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const missingFields = [
    !patient?.dob ? "DOB" : null,
    !patient?.gender ? "Gender" : null,
    !patient?.allergies || patient.allergies.length === 0 ? "Allergies" : null
  ].filter(Boolean) as string[];

  const medications = useMemo(() => {
    const meds = patient?.medications ?? [];
    return meds.map((med) => {
      if (typeof med === "string") {
        return { name: med, dose: "-", frequency: "-" };
      }
      return {
        name: med.name ?? "Medication",
        dose: med.dose ?? "-",
        frequency: med.frequency ?? "-"
      };
    });
  }, [patient]);

  const medicalHistory = patient?.medicalHistory ?? patient?.history ?? [];
  const surgicalHistory = patient?.surgicalHistory ?? [];

  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-soft">
      <header className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            The Chart
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-800">
            {patient?.full_name ?? patient?.name ?? "Select a patient"}
          </h2>
          {patient && (
            <p className="mt-1 text-sm text-slate-500">
              {patient.dob ? `DOB ${patient.dob}` : "DOB N/A"} |{" "}
              {patient.age ? `${patient.age} yrs` : "Age N/A"} |{" "}
              {patient.gender ?? "Gender N/A"} |{" "}
              {patient.patientId ?? patient.id}
            </p>
          )}
        </div>
        {(patient?.chief_complaint || patient?.chiefComplaint) && (
          <div className="max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
              Chief Complaint
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {patient.chief_complaint ?? patient.chiefComplaint}
            </p>
          </div>
        )}
      </header>

      {patient && missingFields.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Missing Demographics: {missingFields.join(", ")}. Please ask patient or
          update via chat.
        </div>
      )}

      <nav className="mt-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
              activeTab === tab
                ? "border-brand bg-brand/10 text-slate-800"
                : "border-slate-200 bg-white text-slate-500 hover:border-brand/50"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {!patient && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Choose a patient from the sidebar to view the chart.
        </div>
      )}

      {patient && activeTab === "Overview" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Demographics
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>Name: {patient.full_name ?? patient.name ?? "N/A"}</p>
              <p>DOB: {patient.dob ?? "N/A"}</p>
              <p>Age: {patient.age ?? "N/A"}</p>
              <p>Gender: {patient.gender ?? "N/A"}</p>
              <p>Patient ID: {patient.patientId ?? patient.id}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              History of Present Illness
            </p>
            <p className="mt-4 text-sm text-slate-600">
              {patient.history_of_present_illness ?? "No HPI recorded yet."}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Allergies
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {(patient.allergies ?? []).length === 0 && (
                <p>No allergies documented.</p>
              )}
              {(patient.allergies ?? []).map((allergy) => (
                <p key={allergy}>{allergy}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {patient && activeTab === "Clinical Data" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Blood Pressure",
                value: patient.vitals?.blood_pressure ?? "--"
              },
              { label: "Heart Rate", value: patient.vitals?.heart_rate ?? "--" },
              {
                label: "Temperature",
                value: patient.vitals?.temperature ?? "--"
              },
              {
                label: "SpO2",
                value: patient.vitals?.oxygen_saturation ?? "--"
              }
            ].map((vital) => (
              <div
                key={vital.label}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {vital.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-800">
                  {vital.value}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Medications
            </p>
            {medications.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No medications on file.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Dose
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Freq
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map((med, index) => (
                      <tr
                        key={`${med.name}-${index}`}
                        className="border-t border-slate-200 text-slate-600"
                      >
                        <td className="px-4 py-3">{med.name}</td>
                        <td className="px-4 py-3">{med.dose}</td>
                        <td className="px-4 py-3">{med.frequency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {patient && activeTab === "History" && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Medical History
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {medicalHistory.length === 0 && <p>No history noted.</p>}
              {medicalHistory.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Surgical History
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              {surgicalHistory.length === 0 && <p>No surgeries listed.</p>}
              {surgicalHistory.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
