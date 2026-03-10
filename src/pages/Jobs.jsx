import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import PageHeader from "../components/PageHeader";
import FilterBar from "../components/FilterBar";

const TYPE_LABELS = {
  inverter_fault: "Inverterio gedimas",
  communication:  "Ryšio problema",
  string_issue:   "Grandinės problema",
  inspection:     "Patikrinimas",
  maintenance:    "Priežiūra",
};

function StatusChip({ value }) {
  const map = {
    open:        { label: "Atidarytas", color: "warning" },
    in_progress: { label: "Vykdoma",    color: "info"    },
    resolved:    { label: "Išspręsta",  color: "success" },
  };
  const m = map[value] || { label: value, color: "default" };
  return <Chip size="small" label={m.label} color={m.color} variant="outlined" />;
}

function PriorityChip({ value }) {
  const map = {
    low:    { label: "Žemas",     color: "default" },
    medium: { label: "Vidutinis", color: "info"    },
    high:   { label: "Aukštas",   color: "error"   },
  };
  const m = map[value] || { label: value, color: "default" };
  return <Chip size="small" label={m.label} color={m.color} variant="outlined" />;
}

const emptyCreateForm = () => ({
  title: "",
  siteId: "",
  type: "inverter_fault",
  priority: "medium",
  requiredLevel: 2,
  description: "",
});

export default function Jobs() {
  const navigate = useNavigate();

  // Firestore duomenys
  const [jobs, setJobs] = useState([]);
  const [sites, setSites] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Filtrai
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assigned, setAssigned] = useState("all");

  // Sukūrimo dialogas
  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Prenumeruojame darbus
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "jobs"),
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingJobs(false);
      },
      (err) => { console.error("Darbų klaida:", err); setLoadingJobs(false); }
    );
    return () => unsub();
  }, []);

  // Prenumeruojame objektus (filtrams + formai)
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
    return jobs.filter((r) => {
      const matchesSearch =
        !q ||
        (r.id || "").toLowerCase().includes(q) ||
        (r.title || "").toLowerCase().includes(q) ||
        (r.siteName || "").toLowerCase().includes(q);
      const matchesSite     = siteFilter === "all" || r.siteId === siteFilter;
      const matchesStatus   = status === "all"     || r.status === status;
      const matchesPriority = priority === "all"   || r.priority === priority;
      const matchesAssigned =
        assigned === "all"       ? true
        : assigned === "assigned"  ? !!r.assignedTo
        : !r.assignedTo;
      return matchesSearch && matchesSite && matchesStatus && matchesPriority && matchesAssigned;
    });
  }, [jobs, search, siteFilter, status, priority, assigned]);

  const columns = useMemo(() => [
    { field: "id", headerName: "ID", width: 120 },
    { field: "title", headerName: "Pavadinimas", flex: 1, minWidth: 220 },
    { field: "siteName", headerName: "Objektas", width: 200, valueFormatter: (v) => v || "—" },
    {
      field: "type",
      headerName: "Tipas",
      width: 180,
      valueGetter: (value) => TYPE_LABELS[value] || value || "—",
    },
    {
      field: "priority",
      headerName: "Prioritetas",
      width: 120,
      renderCell: (p) => <PriorityChip value={p.value} />,
      sortable: false,
    },
    {
      field: "status",
      headerName: "Statusas",
      width: 140,
      renderCell: (p) => <StatusChip value={p.value} />,
      sortable: false,
    },
    {
      field: "assignedName",
      headerName: "Atsakingas",
      width: 160,
      valueFormatter: (value) => value || "—",
    },
    { field: "updatedAt", headerName: "Atnaujinta", width: 130, valueFormatter: (v) => v || "—" },
  ], []);

  const onReset = () => {
    setSearch("");
    setSiteFilter("all");
    setStatus("all");
    setPriority("all");
    setAssigned("all");
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError("");
    const site = sites.find((s) => s.id === createForm.siteId);
    try {
      await addDoc(collection(db, "jobs"), {
        title:         createForm.title,
        description:   createForm.description,
        siteId:        createForm.siteId || null,
        siteName:      site?.name || null,
        type:          createForm.type,
        priority:      createForm.priority,
        requiredLevel: Number(createForm.requiredLevel),
        status:        "open",
        assignedTo:    null,
        assignedName:  null,
        createdAt:     serverTimestamp(),
        updatedAt:     new Date().toISOString().slice(0, 10),
      });
      setOpenCreate(false);
      setCreateForm(emptyCreateForm());
    } catch (e) {
      console.error("Darbo sukūrimo klaida:", e);
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Darbai"
        subtitle="Gedimų ir techninių darbų valdymas"
        primaryAction={{
          label: "Sukurti darbą",
          icon: <AddIcon />,
          onClick: () => { setCreateForm(emptyCreateForm()); setCreateError(""); setOpenCreate(true); },
        }}
      />

      <FilterBar search={search} onSearchChange={setSearch} onReset={onReset}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Objektas</InputLabel>
          <Select label="Objektas" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <MenuItem value="all">Visi</MenuItem>
            {sites.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statusas</InputLabel>
          <Select label="Statusas" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="all">Visi</MenuItem>
            <MenuItem value="open">Atidarytas</MenuItem>
            <MenuItem value="in_progress">Vykdoma</MenuItem>
            <MenuItem value="resolved">Išspręsta</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Prioritetas</InputLabel>
          <Select label="Prioritetas" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <MenuItem value="all">Visi</MenuItem>
            <MenuItem value="low">Žemas</MenuItem>
            <MenuItem value="medium">Vidutinis</MenuItem>
            <MenuItem value="high">Aukštas</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Priskyrimas</InputLabel>
          <Select label="Priskyrimas" value={assigned} onChange={(e) => setAssigned(e.target.value)}>
            <MenuItem value="all">Visi</MenuItem>
            <MenuItem value="assigned">Priskirtas</MenuItem>
            <MenuItem value="unassigned">Nepriskirtas</MenuItem>
          </Select>
        </FormControl>
      </FilterBar>

      <Paper sx={{ borderRadius: 2 }} variant="outlined">
        <Box sx={{ height: 560, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loadingJobs}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
              sorting: { sortModel: [{ field: "updatedAt", sort: "desc" }] },
            }}
            onRowClick={(params) => navigate(`/jobs/${params.id}`)}
            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
          />
        </Box>
      </Paper>

      {/* Darbo sukūrimo dialogas */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Sukurti darbą</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Pavadinimas"
              value={createForm.title}
              onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Objektas</InputLabel>
              <Select
                label="Objektas"
                value={createForm.siteId}
                onChange={(e) => setCreateForm((p) => ({ ...p, siteId: e.target.value }))}
              >
                <MenuItem value="">— Nėra —</MenuItem>
                {sites.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Tipas</InputLabel>
              <Select
                label="Tipas"
                value={createForm.type}
                onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value }))}
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Prioritetas</InputLabel>
                <Select
                  label="Prioritetas"
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  <MenuItem value="low">Žemas</MenuItem>
                  <MenuItem value="medium">Vidutinis</MenuItem>
                  <MenuItem value="high">Aukštas</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Reikalingas lygis</InputLabel>
                <Select
                  label="Reikalingas lygis"
                  value={createForm.requiredLevel}
                  onChange={(e) => setCreateForm((p) => ({ ...p, requiredLevel: Number(e.target.value) }))}
                >
                  {[1, 2, 3, 4, 5].map((l) => <MenuItem key={l} value={l}>L{l}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Aprašymas"
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              multiline
              minRows={3}
              fullWidth
            />

            {createError && <Alert severity="error">{createError}</Alert>}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCreate(false)}>Atšaukti</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !createForm.title}
          >
            {creating ? "Kuriama..." : "Sukurti"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
