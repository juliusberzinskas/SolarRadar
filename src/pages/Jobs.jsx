import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

const JOB_TYPE_KEYS = [
  "inverter_fault",
  "communication",
  "string_issue",
  "inspection",
  "maintenance",
];

function StatusChip({ value }) {
  const { t } = useTranslation();
  const map = {
    open:        { key: "status.open",        color: "warning" },
    in_progress: { key: "status.in_progress", color: "info"    },
    resolved:    { key: "status.resolved",    color: "success" },
  };
  const m = map[value] || { key: value, color: "default" };
  return <Chip size="small" label={t(m.key, m.key)} color={m.color} variant="outlined" />;
}

function PriorityChip({ value }) {
  const { t } = useTranslation();
  const map = {
    low:    { key: "priority.low",    color: "default" },
    medium: { key: "priority.medium", color: "info"    },
    high:   { key: "priority.high",   color: "error"   },
  };
  const m = map[value] || { key: value, color: "default" };
  return <Chip size="small" label={t(m.key, m.key)} color={m.color} variant="outlined" />;
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
  const { t } = useTranslation();

  const [jobs, setJobs] = useState([]);
  const [sites, setSites] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [assigned, setAssigned] = useState("all");

  const [openCreate, setOpenCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm());
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "jobs"),
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingJobs(false);
      },
      (err) => { console.error("Jobs error:", err); setLoadingJobs(false); }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "sites"),
      (snap) => setSites(snap.docs.map((d) => ({ id: d.id, name: d.data().name }))),
      (err) => console.error("Sites error:", err)
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
        assigned === "all"      ? true
        : assigned === "assigned" ? !!r.assignedTo
        : !r.assignedTo;
      return matchesSearch && matchesSite && matchesStatus && matchesPriority && matchesAssigned;
    });
  }, [jobs, search, siteFilter, status, priority, assigned]);

  const columns = useMemo(() => [
    { field: "id", headerName: "ID", width: 120 },
    { field: "title", headerName: t("pages.jobs.col.name"), flex: 1, minWidth: 220 },
    { field: "siteName", headerName: t("pages.jobs.col.site"), width: 200, valueFormatter: (v) => v || "—" },
    {
      field: "type",
      headerName: t("pages.jobs.col.type"),
      width: 180,
      valueGetter: (value) => t(`jobType.${value}`, value || "—"),
    },
    {
      field: "priority",
      headerName: t("pages.jobs.col.priority"),
      width: 120,
      renderCell: (p) => <PriorityChip value={p.value} />,
      sortable: false,
    },
    {
      field: "status",
      headerName: t("pages.jobs.col.status"),
      width: 140,
      renderCell: (p) => <StatusChip value={p.value} />,
      sortable: false,
    },
    {
      field: "assignedName",
      headerName: t("pages.jobs.col.assigned"),
      width: 160,
      valueFormatter: (value) => value || "—",
    },
    { field: "updatedAt", headerName: t("pages.jobs.col.updated"), width: 130, valueFormatter: (v) => v || "—" },
  ], [t]);

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
      console.error("Job create error:", e);
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("pages.jobs.title")}
        subtitle={t("pages.jobs.subtitle")}
        primaryAction={{
          label: t("pages.jobs.create"),
          icon: <AddIcon />,
          onClick: () => { setCreateForm(emptyCreateForm()); setCreateError(""); setOpenCreate(true); },
        }}
      />

      <FilterBar search={search} onSearchChange={setSearch} onReset={onReset}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t("pages.jobs.filter.site")}</InputLabel>
          <Select label={t("pages.jobs.filter.site")} value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <MenuItem value="all">{t("common.all")}</MenuItem>
            {sites.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t("pages.jobs.filter.status")}</InputLabel>
          <Select label={t("pages.jobs.filter.status")} value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="all">{t("common.all")}</MenuItem>
            <MenuItem value="open">{t("status.open")}</MenuItem>
            <MenuItem value="in_progress">{t("status.in_progress")}</MenuItem>
            <MenuItem value="resolved">{t("status.resolved")}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t("pages.jobs.filter.priority")}</InputLabel>
          <Select label={t("pages.jobs.filter.priority")} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <MenuItem value="all">{t("common.all")}</MenuItem>
            <MenuItem value="low">{t("priority.low")}</MenuItem>
            <MenuItem value="medium">{t("priority.medium")}</MenuItem>
            <MenuItem value="high">{t("priority.high")}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>{t("pages.jobs.filter.assignment")}</InputLabel>
          <Select label={t("pages.jobs.filter.assignment")} value={assigned} onChange={(e) => setAssigned(e.target.value)}>
            <MenuItem value="all">{t("common.all")}</MenuItem>
            <MenuItem value="assigned">{t("pages.jobs.filter.assigned")}</MenuItem>
            <MenuItem value="unassigned">{t("pages.jobs.filter.unassigned")}</MenuItem>
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

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t("pages.jobs.dialog.title")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label={t("pages.jobs.form.title")}
              value={createForm.title}
              onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>{t("pages.jobs.form.site")}</InputLabel>
              <Select
                label={t("pages.jobs.form.site")}
                value={createForm.siteId}
                onChange={(e) => setCreateForm((p) => ({ ...p, siteId: e.target.value }))}
              >
                <MenuItem value="">{t("pages.jobs.form.noSite")}</MenuItem>
                {sites.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>{t("pages.jobs.form.type")}</InputLabel>
              <Select
                label={t("pages.jobs.form.type")}
                value={createForm.type}
                onChange={(e) => setCreateForm((p) => ({ ...p, type: e.target.value }))}
              >
                {JOB_TYPE_KEYS.map((k) => (
                  <MenuItem key={k} value={k}>{t(`jobType.${k}`)}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel>{t("pages.jobs.form.priority")}</InputLabel>
                <Select
                  label={t("pages.jobs.form.priority")}
                  value={createForm.priority}
                  onChange={(e) => setCreateForm((p) => ({ ...p, priority: e.target.value }))}
                >
                  <MenuItem value="low">{t("priority.low")}</MenuItem>
                  <MenuItem value="medium">{t("priority.medium")}</MenuItem>
                  <MenuItem value="high">{t("priority.high")}</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>{t("pages.jobs.form.reqLevel")}</InputLabel>
                <Select
                  label={t("pages.jobs.form.reqLevel")}
                  value={createForm.requiredLevel}
                  onChange={(e) => setCreateForm((p) => ({ ...p, requiredLevel: Number(e.target.value) }))}
                >
                  {[1, 2, 3, 4, 5].map((l) => <MenuItem key={l} value={l}>L{l}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label={t("pages.jobs.form.description")}
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
          <Button onClick={() => setOpenCreate(false)}>{t("common.cancel")}</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !createForm.title}
          >
            {creating ? t("pages.jobs.creating") : t("pages.jobs.create")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
