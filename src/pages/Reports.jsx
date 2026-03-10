/**
 * Ataskaitos — techniko pateiktų ataskaitų sąrašas.
 *
 * Firestore duomenų modelis (techniko mobili app turi rašyti):
 * ─────────────────────────────────────────────────────────────
 * Kolekcija: reports/{reportId}
 * {
 *   jobId:           string,     // darbo ID iš jobs kolekcijos
 *   jobTitle:        string,     // darbo pavadinimas (denormalizuotas)
 *   siteId:          string,     // objekto ID iš sites kolekcijos
 *   siteName:        string,     // objekto pavadinimas (denormalizuotas)
 *   technicianId:    string,     // Firebase Auth UID
 *   technicianName:  string,     // techniko vardas (denormalizuotas)
 *   submittedAt:     Timestamp,  // kada pateikta (Timestamp)
 *   status:          "completed" | "not_completed" | "requires_maintenance",
 *   notes:           string,     // techniko pastabos
 *   photoUrls:       string[],   // nuotraukų atsisiuntimo URL iš Storage
 *                                // Storage kelias: reports/{reportId}/photos/{filename}
 * }
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PageHeader from "../components/PageHeader";
import FilterBar from "../components/FilterBar";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/lt";

dayjs.extend(relativeTime);
dayjs.locale("lt");

// ── Statusų konfigūracija ─────────────────────────────────────────────────────
const STATUS_CFG = {
  completed:             { label: "Atlikta",               color: "success" },
  not_completed:         { label: "Neatlikta",             color: "error"   },
  requires_maintenance:  { label: "Reikalinga priežiūra",  color: "warning" },
};

function StatusChip({ value }) {
  const cfg = STATUS_CFG[value] || { label: value || "—", color: "default" };
  return <Chip size="small" label={cfg.label} color={cfg.color} variant="outlined" />;
}

function formatDate(val) {
  if (!val) return "—";
  try {
    const d = typeof val.toDate === "function" ? val.toDate() : new Date(val);
    return dayjs(d).format("YYYY-MM-DD HH:mm");
  } catch { return "—"; }
}

// ── Tuščia būsena ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <Box sx={{ p: 6, textAlign: "center" }}>
      <AssignmentIcon sx={{ fontSize: 56, color: "text.disabled", mb: 2 }} />
      <Typography variant="h6" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
        Ataskaitų dar nėra
      </Typography>
      <Typography variant="body2" color="text.disabled" sx={{ maxWidth: 420, mx: "auto" }}>
        Kai technikas pateiks ataskaitą iš mobiliosios programėlės, ji atsiras čia.
        Ataskaitos saugomos Firestore kolekcijoje <b>reports</b>.
      </Typography>
    </Box>
  );
}

// ── Puslapis ──────────────────────────────────────────────────────────────────
export default function Reports() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [sites, setSites] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  // Filtrai
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");

  // Prenumeruojame ataskaitas
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "reports"),
      (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingReports(false);
      },
      (err) => {
        console.error("Ataskaitų klaida:", err);
        setLoadingReports(false);
      }
    );
    return () => unsub();
  }, []);

  // Prenumeruojame objektus (filtrams)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "sites"),
      (snap) => setSites(snap.docs.map((d) => ({ id: d.id, name: d.data().name }))),
      (err) => console.error("Objektų klaida:", err)
    );
    return () => unsub();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      const matchesSearch =
        !q ||
        (r.technicianName || "").toLowerCase().includes(q) ||
        (r.jobTitle || "").toLowerCase().includes(q) ||
        (r.siteName || "").toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesSite   = siteFilter === "all"   || r.siteId === siteFilter;
      return matchesSearch && matchesStatus && matchesSite;
    });
  }, [reports, search, statusFilter, siteFilter]);

  const columns = useMemo(() => [
    {
      field: "technicianName",
      headerName: "Technikas",
      width: 180,
      valueFormatter: (v) => v || "—",
    },
    {
      field: "jobTitle",
      headerName: "Darbas",
      flex: 1,
      minWidth: 200,
      valueFormatter: (v) => v || "—",
    },
    {
      field: "siteName",
      headerName: "Objektas",
      width: 180,
      valueFormatter: (v) => v || "—",
    },
    {
      field: "status",
      headerName: "Statusas",
      width: 200,
      renderCell: (p) => <StatusChip value={p.value} />,
      sortable: false,
    },
    {
      field: "photoUrls",
      headerName: "Nuotraukos",
      width: 120,
      sortable: false,
      renderCell: (p) => {
        const count = Array.isArray(p.value) ? p.value.length : 0;
        return (
          <Chip
            size="small"
            label={count > 0 ? `${count} nuotr.` : "—"}
            variant="outlined"
            color={count > 0 ? "info" : "default"}
          />
        );
      },
    },
    {
      field: "submittedAt",
      headerName: "Pateikta",
      width: 160,
      renderCell: (p) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(p.value)}
        </Typography>
      ),
    },
  ], []);

  const onReset = () => {
    setSearch("");
    setStatusFilter("all");
    setSiteFilter("all");
  };

  return (
    <Box>
      <PageHeader
        title="Ataskaitos"
        subtitle="Technikų pateiktos darbo ataskaitos iš mobiliojo"
      />

      <FilterBar search={search} onSearchChange={setSearch} onReset={onReset}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Statusas</InputLabel>
          <Select label="Statusas" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="all">Visi</MenuItem>
            <MenuItem value="completed">Atlikta</MenuItem>
            <MenuItem value="not_completed">Neatlikta</MenuItem>
            <MenuItem value="requires_maintenance">Reikalinga priežiūra</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Objektas</InputLabel>
          <Select label="Objektas" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <MenuItem value="all">Visi</MenuItem>
            {sites.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </Select>
        </FormControl>
      </FilterBar>

      <Paper sx={{ borderRadius: 2 }} variant="outlined">
        {!loadingReports && reports.length === 0 ? (
          <EmptyState />
        ) : (
          <Box sx={{ height: 560, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loadingReports}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
                sorting: { sortModel: [{ field: "submittedAt", sort: "desc" }] },
              }}
              onRowClick={(params) => navigate(`/reports/${params.id}`)}
              sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}
