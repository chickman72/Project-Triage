"use client";

import { useEffect, useMemo, useState } from "react";

type PatientSummary = {
  id: string;
  patientId?: string;
  full_name?: string;
  name?: string;
  age?: number;
  gender?: string;
  dob?: string;
  chiefComplaint?: string;
  chief_complaint?: string;
};

type PatientListProps = {
  selectedPatientId: string | null;
  onSelect: (patientId: string) => void;
};

export default function PatientList({
  selectedPatientId,
  onSelect
}: PatientListProps) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/patients?summary=1");
        if (!response.ok) {
          throw new Error("Failed to fetch patients");
        }
        const data = (await response.json()) as { patients: PatientSummary[] };
        setPatients(data.patients ?? []);
      } catch (error) {
        setPatients([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) => {
      const haystack = [
        patient.full_name,
        patient.name,
        patient.patientId,
        patient.id,
        patient.chief_complaint,
        patient.chiefComplaint
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [patients, search]);

  return (
    <section className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-soft">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          Patients
        </p>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search patients..."
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 outline-none focus:border-brand"
        />
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {isLoading && (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Loading patients...
          </div>
        )}
        {!isLoading && filteredPatients.length === 0 && (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No patients found.
          </div>
        )}
        {filteredPatients.map((patient) => {
          const patientKey = patient.patientId ?? patient.id;
          const isActive = patientKey === selectedPatientId;
          const displayName =
            patient.full_name ?? patient.name ?? "Unnamed patient";
          return (
            <button
              key={patientKey}
              type="button"
              onClick={() => onSelect(patientKey)}
              className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                isActive
                  ? "border-brand bg-brand/10 text-slate-800"
                  : "border-slate-200 bg-white hover:border-brand/50"
              }`}
            >
              <p className="text-sm font-semibold text-slate-800">
                {displayName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {patient.dob ? `DOB ${patient.dob}` : "DOB N/A"} ·{" "}
                {patient.age ? `${patient.age} yrs` : "Age N/A"} ·{" "}
                {patient.gender ?? "Gender N/A"}
              </p>
              {(patient.chief_complaint || patient.chiefComplaint) && (
                <p className="mt-2 text-xs text-slate-500">
                  {patient.chief_complaint ?? patient.chiefComplaint}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
