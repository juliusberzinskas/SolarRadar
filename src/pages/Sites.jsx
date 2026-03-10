import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  addDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Paper,
  Stack,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import MapIcon from "@mui/icons-material/Map";

import PageHeader from "../components/PageHeader";
import FilterBar from "../components/FilterBar";

const REGIONS = ["Kaunas", "Vilnius", "Klaipėda", "Šiauliai", "Panevėžys", "Alytus"];

const emptyForm = () => ({
  name: "",
  address: "",
  region: "Kaunas",
  status: "active",
  lat: "",
  lng: "",
  capacityKw: "",
});

function StatusChip({ value }) {
  const label = value === "active" ? "Aktyvus" : "Neaktyvus";
  const color = value === "active" ? "success" : "default";
  return <Chip size="small" label={label} color={color} variant="outlined" />;
}

export default function Sites() {
  const navigate = useNavigate();

  // Firestore data
  const [sites, setSites] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");

  // Dialogs
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saveError, setSaveError] = useState("");

  // Subscribe to sites collection
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "sites"),
      (snapshot) => {
        setSites(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingData(false);
      },
      (err) => {
        console.error("Sites listener error:", err);
        setLoadingData(false);
      }
    );
    return () => unsub();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sites.filter((r) => {
      const matchesSearch =
        !q ||
        (r.name || "").toLowerCase().includes(q) ||
        (r.address || "").toLowerCase().includes(q);

      const matchesRegion = region === "all" ? true : r.region === region;
      const matchesStatus = status === "all" ? true : r.status === status;

      return matchesSearch && matchesRegion && matchesStatus;
    });
  }, [sites, search, region, status]);

  const columns = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 140 },
      { field: "name", headerName: "Pavadinimas", flex: 1, minWidth: 200 },
      { field: "address", headerName: "Adresas", flex: 1, minWidth: 200 },
      { field: "region", headerName: "Regionas", width: 130 },
      {
        field: "status",
        headerName: "Statusas",
        width: 120,
        renderCell: (params) => <StatusChip value={params.value} />,
        sortable: false,
      },
      {
        field: "capacityKw",
        headerName: "kW",
        width: 110,
        valueFormatter: (value) => (value != null ? `${value} kW` : "—"),
      },
      {
        field: "updatedAt",
        headerName: "Atnaujinta",
        width: 130,
        valueFormatter: (value) => value || "—",
      },
    ],
    []
  );

  const onReset = () => {
    setSearch("");
    setRegion("all");
    setStatus("all");
  };

  const openCreateDialog = () => {
    setForm(emptyForm());
    setSaveError("");
    setOpenCreate(true);
  };

  const buildDocData = (f) => ({
    name: f.name,
    address: f.address,
    region: f.region,
    status: f.status,
    capacityKw: f.capacityKw !== "" ? parseFloat(f.capacityKw) : null,
    location: {
      lat: f.lat !== "" ? parseFloat(f.lat) : null,
      lng: f.lng !== "" ? parseFloat(f.lng) : null,
    },
    updatedAt: new Date().toISOString().slice(0, 10),
  });

  const handleCreate = async () => {
    setSaveError("");
    try {
      await addDoc(collection(db, "sites"), {
        ...buildDocData(form),
        createdAt: new Date().toISOString().slice(0, 10),
      });
      setOpenCreate(false);
    } catch (e) {
      console.error("Create site error:", e);
      setSaveError(e.message);
    }
  };

  // Form fields used in Create dialog
  const FormFields = (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField
        label="Objekto pavadinimas"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        fullWidth
      />
      <TextField
        label="Adresas"
        value={form.address}
        onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
        fullWidth
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <FormControl fullWidth>
          <InputLabel>Regionas</InputLabel>
          <Select
            label="Regionas"
            value={form.region}
            onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
          >
            {REGIONS.map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Statusas</InputLabel>
          <Select
            label="Statusas"
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
          >
            <MenuItem value="active">Aktyvus</MenuItem>
            <MenuItem value="inactive">Neaktyvus</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <TextField
        label="Galia (kW)"
        value={form.capacityKw}
        onChange={(e) => setForm((p) => ({ ...p, capacityKw: e.target.value }))}
        fullWidth
        type="number"
        inputProps={{ step: "0.1" }}
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Platuma"
          value={form.lat}
          onChange={(e) => setForm((p) => ({ ...p, lat: e.target.value }))}
          fullWidth
          type="number"
          inputProps={{ step: "0.0001" }}
        />
        <TextField
          label="Ilguma"
          value={form.lng}
          onChange={(e) => setForm((p) => ({ ...p, lng: e.target.value }))}
          fullWidth
          type="number"
          inputProps={{ step: "0.0001" }}
        />
      </Stack>
    </Stack>
  );

  return (
    <Box>
      <PageHeader
        title="Objektai"
        subtitle="Objektų registravimas ir lokacijų valdymas"
        primaryAction={{
          label: "Pridėti objektą",
          icon: <AddIcon />,
          onClick: openCreateDialog,
        }}
        actions={
          <Button variant="outlined" startIcon={<MapIcon />}>
            Map view (stub)
          </Button>
        }
      />

      <FilterBar search={search} onSearchChange={setSearch} onReset={onReset}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Regionas</InputLabel>
          <Select label="Regionas" value={region} onChange={(e) => setRegion(e.target.value)}>
            <MenuItem value="all">Visi</MenuItem>
            {REGIONS.map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Statusas</InputLabel>
          <Select label="Statusas" value={status} onChange={(e) => setStatus(e.target.value)}>
            <MenuItem value="all">Visi</MenuItem>
            <MenuItem value="active">Aktyvus</MenuItem>
            <MenuItem value="inactive">Neaktyvus</MenuItem>
          </Select>
        </FormControl>
      </FilterBar>

      <Paper sx={{ borderRadius: 2 }} variant="outlined">
        <Box sx={{ height: 520, width: "100%" }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loadingData}
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10, page: 0 } },
            }}
            onRowClick={(params) => navigate(`/sites/${params.id}`)}
            sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
          />
        </Box>
      </Paper>

      {/* Create Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle>Pridėti objektą</DialogTitle>
        <DialogContent>
          {FormFields}
          {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCreate(false)}>Atšaukti</Button>
          <Button variant="contained" onClick={handleCreate}>Išsaugoti</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
