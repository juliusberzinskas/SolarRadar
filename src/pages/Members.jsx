import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
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
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import PageHeader from "../components/PageHeader";
import FilterBar from "../components/FilterBar";

function yearsInCompany(hiredAt) {
  if (!hiredAt) return null;
  const years = dayjs().diff(dayjs(hiredAt), "year");
  return years < 1 ? "<1" : String(years);
}

function ActiveChip({ value }) {
  return (
    <Chip
      size="small"
      label={value ? "Aktyvus" : "Neaktyvus"}
      color={value ? "success" : "default"}
      variant="outlined"
    />
  );
}

const emptyForm = () => ({
  displayName: "",
  email: "",
  active: true,
  hiredAt: dayjs(),
  level: 1,
});

export default function Members() {
  // Firestore data
  const [members, setMembers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [minYears, setMinYears] = useState("all");

  // Dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saveError, setSaveError] = useState("");

  // Subscribe to technicians in Firestore
  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "technician"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingData(false);
      },
      (err) => {
        console.error("Members listener error:", err);
        setLoadingData(false);
      }
    );
    return () => unsub();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        !q ||
        (m.displayName || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q);

      const matchesActive =
        activeFilter === "all" ? true : activeFilter === "active" ? m.active : !m.active;

      const yearsStr = yearsInCompany(m.hiredAt);
      const yearsNum = yearsStr === "<1" ? 0 : Number(yearsStr ?? 0);
      const matchesMinYears = minYears === "all" ? true : yearsNum >= Number(minYears);

      return matchesSearch && matchesActive && matchesMinYears;
    });
  }, [members, search, activeFilter, minYears]);

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 150 },
      { field: "displayName", headerName: "Vardas", flex: 1, minWidth: 220 },
      { field: "email", headerName: "El. paštas", width: 220 },
      {
        field: "level",
        headerName: "Lygis",
        width: 90,
        renderCell: (p) => (
          <Chip size="small" label={`L${p.value ?? "?"}`} variant="outlined" sx={{ fontWeight: 700 }} />
        ),
      },
      {
        field: "active",
        headerName: "Statusas",
        width: 130,
        renderCell: (p) => <ActiveChip value={p.value} />,
        sortable: false,
      },
      { field: "hiredAt", headerName: "Įdarbinimo data", width: 140 },
      {
        field: "years",
        headerName: "Metai",
        width: 100,
        sortable: false,
        renderCell: (params) => {
          const y = yearsInCompany(params.row.hiredAt);
          return (
            <Chip
              size="small"
              label={y === "<1" ? "<1 m." : y ? `${y} m.` : "—"}
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "",
        width: 70,
        sortable: false,
        filterable: false,
        renderCell: (p) => (
          <IconButton
            size="small"
            onClick={() => {
              setEditingRow(p.row);
              setForm({
                displayName: p.row.displayName ?? "",
                email: p.row.email ?? "",
                active: !!p.row.active,
                hiredAt: p.row.hiredAt ? dayjs(p.row.hiredAt) : dayjs(),
                level: p.row.level ?? 1,
              });
              setSaveError("");
              setOpenEdit(true);
            }}
            title="Edit"
          >
            <EditIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    []
  );

  const onReset = () => {
    setSearch("");
    setActiveFilter("all");
    setMinYears("all");
  };

  const openCreateDialog = () => {
    setForm(emptyForm());
    setSaveError("");
    setOpenCreate(true);
  };

  const handleCreate = async () => {
    setSaveError("");
    try {
      await addDoc(collection(db, "users"), {
        role: "technician",
        displayName: form.displayName,
        email: form.email,
        active: form.active,
        hiredAt: form.hiredAt ? form.hiredAt.format("YYYY-MM-DD") : null,
        level: form.level,
        createdAt: serverTimestamp(),
      });
      setOpenCreate(false);
    } catch (e) {
      console.error("Create member error:", e);
      setSaveError(e.message);
    }
  };

  const handleUpdate = async () => {
    setSaveError("");
    try {
      await updateDoc(doc(db, "users", editingRow.id), {
        displayName: form.displayName,
        email: form.email,
        active: form.active,
        hiredAt: form.hiredAt ? form.hiredAt.format("YYYY-MM-DD") : null,
        level: form.level,
      });
      setOpenEdit(false);
    } catch (e) {
      console.error("Update member error:", e);
      setSaveError(e.message);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <PageHeader
          title="Darbuotojai"
          subtitle="Technikų profiliai ir įdarbinimo data"
          primaryAction={{
            label: "Pridėti darbuotoją",
            icon: <AddIcon />,
            onClick: openCreateDialog,
          }}
        />

        <FilterBar search={search} onSearchChange={setSearch} onReset={onReset}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Statusas</InputLabel>
            <Select label="Statusas" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
              <MenuItem value="all">Visi</MenuItem>
              <MenuItem value="active">Aktyvus</MenuItem>
              <MenuItem value="inactive">Neaktyvus</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Min. metai</InputLabel>
            <Select label="Min. metai" value={minYears} onChange={(e) => setMinYears(e.target.value)}>
              <MenuItem value="all">Visi</MenuItem>
              <MenuItem value="0">0+</MenuItem>
              <MenuItem value="1">1+</MenuItem>
              <MenuItem value="3">3+</MenuItem>
              <MenuItem value="5">5+</MenuItem>
              <MenuItem value="10">10+</MenuItem>
            </Select>
          </FormControl>
        </FilterBar>

        <Paper sx={{ borderRadius: 2 }} variant="outlined">
          <Box sx={{ height: 560, width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loadingData}
              pageSizeOptions={[5, 10, 25]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
              disableRowSelectionOnClick
            />
          </Box>
        </Paper>

        {/* Sukūrimo dialogas */}
        <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
          <DialogTitle>Pridėti darbuotoją</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Vardas ir pavardė"
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                fullWidth
              />
              <TextField
                label="El. paštas"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                fullWidth
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <DatePicker
                  label="Įdarbinimo data"
                  value={form.hiredAt}
                  onChange={(v) => setForm((p) => ({ ...p, hiredAt: v }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />

                <FormControl fullWidth>
                  <InputLabel>Įgūdžių lygis</InputLabel>
                  <Select
                    label="Įgūdžių lygis"
                    value={form.level}
                    onChange={(e) => setForm((p) => ({ ...p, level: Number(e.target.value) }))}
                  >
                    {[1, 2, 3, 4, 5].map((l) => (
                      <MenuItem key={l} value={l}>L{l}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography>Statusas</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {form.active ? "Aktyvus" : "Neaktyvus"}
                  </Typography>
                  <Switch
                    checked={form.active}
                    onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  />
                </Stack>
              </Stack>

              {saveError && <Alert severity="error">{saveError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenCreate(false)}>Atšaukti</Button>
            <Button variant="contained" onClick={handleCreate}>Išsaugoti</Button>
          </DialogActions>
        </Dialog>

        {/* Redagavimo dialogas */}
        <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
          <DialogTitle>Redaguoti darbuotoją</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                ID: <b>{editingRow?.id}</b>
              </Typography>

              <TextField
                label="Vardas ir pavardė"
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                fullWidth
              />
              <TextField
                label="El. paštas"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                fullWidth
              />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <DatePicker
                  label="Įdarbinimo data"
                  value={form.hiredAt}
                  onChange={(v) => setForm((p) => ({ ...p, hiredAt: v }))}
                  slotProps={{ textField: { fullWidth: true } }}
                />

                <FormControl fullWidth>
                  <InputLabel>Įgūdžių lygis</InputLabel>
                  <Select
                    label="Įgūdžių lygis"
                    value={form.level}
                    onChange={(e) => setForm((p) => ({ ...p, level: Number(e.target.value) }))}
                  >
                    {[1, 2, 3, 4, 5].map((l) => (
                      <MenuItem key={l} value={l}>L{l}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography>Statusas</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {form.active ? "Aktyvus" : "Neaktyvus"}
                  </Typography>
                  <Switch
                    checked={form.active}
                    onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                  />
                </Stack>
              </Stack>

              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography fontWeight={700} sx={{ mb: 0.5 }}>Metai įmonėje (peržiūra)</Typography>
                <Typography variant="body2" color="text.secondary">
                  {form.hiredAt
                    ? yearsInCompany(form.hiredAt.format("YYYY-MM-DD")) === "<1"
                      ? "<1 metai"
                      : `${yearsInCompany(form.hiredAt.format("YYYY-MM-DD"))} m.`
                    : "—"}
                </Typography>
              </Paper>

              {saveError && <Alert severity="error">{saveError}</Alert>}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setOpenEdit(false)}>Atšaukti</Button>
            <Button variant="contained" onClick={handleUpdate}>Atnaujinti</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
}
