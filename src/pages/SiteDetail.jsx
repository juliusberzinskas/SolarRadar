import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import {
  ref,
  listAll,
  getDownloadURL,
  uploadBytesResumable,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "../firebase";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";

const REGIONS = ["Kaunas", "Vilnius", "Klaipėda", "Šiauliai", "Panevėžys", "Alytus"];
const MOUNTING_TYPES = ["Stogo", "Žemės", "Plūduriuojantis", "Automobilių stoginė"];

function StatusChip({ value }) {
  const label = value === "active" ? "Aktyvus" : "Neaktyvus";
  const color = value === "active" ? "success" : "default";
  return <Chip size="small" label={label} color={color} variant="outlined" />;
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

// ── Informacijos skirtukas ────────────────────────────────────────────────────
function InfoTab({ site, siteId }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!site) return;
    const lat = site.location?.lat ?? site.lat ?? "";
    const lng = site.location?.lng ?? site.lng ?? "";
    setForm({
      name: site.name ?? "",
      address: site.address ?? "",
      region: site.region ?? "Kaunas",
      status: site.status ?? "active",
      capacityKw: site.capacityKw != null ? String(site.capacityKw) : "",
      lat: lat != null ? String(lat) : "",
      lng: lng != null ? String(lng) : "",
    });
  }, [site]);

  if (!form) return <Skeleton height={300} />;

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      await updateDoc(doc(db, "sites", siteId), {
        name: form.name,
        address: form.address,
        region: form.region,
        status: form.status,
        capacityKw: form.capacityKw !== "" ? parseFloat(form.capacityKw) : null,
        location: {
          lat: form.lat !== "" ? parseFloat(form.lat) : null,
          lng: form.lng !== "" ? parseFloat(form.lng) : null,
        },
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const f = (field) => ({
    value: form[field],
    onChange: (e) => setForm((p) => ({ ...p, [field]: e.target.value })),
  });

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Objekto pavadinimas" fullWidth {...f("name")} />
          <TextField label="Adresas" fullWidth {...f("address")} />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Regionas</InputLabel>
            <Select label="Regionas" value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}>
              {REGIONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Statusas</InputLabel>
            <Select label="Statusas" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <MenuItem value="active">Aktyvus</MenuItem>
              <MenuItem value="inactive">Neaktyvus</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <TextField
          label="Galia (kW)"
          type="number"
          inputProps={{ step: "0.1" }}
          fullWidth
          {...f("capacityKw")}
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Platuma" type="number" inputProps={{ step: "0.0001" }} fullWidth {...f("lat")} />
          <TextField label="Ilguma" type="number" inputProps={{ step: "0.0001" }} fullWidth {...f("lng")} />
        </Stack>

        {saveError && <Alert severity="error">{saveError}</Alert>}
        {saved && <Alert severity="success">Sėkmingai išsaugota.</Alert>}

        <Box>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saugoma..." : "Išsaugoti pakeitimus"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

// ── Žemėlapio skirtukas ───────────────────────────────────────────────────────
function MapTab({ site }) {
  const lat = site?.location?.lat ?? site?.lat;
  const lng = site?.location?.lng ?? site?.lng;
  const hasCoords = lat != null && lng != null;

  if (!hasCoords) {
    return (
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
        <Typography color="text.secondary">
          Koordinatės dar neįvestos. Įveskite platumą ir ilgumą Informacijos skirtuke, kad matytumėte žemėlapį.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
      <iframe
        title="Objekto vieta"
        src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
        width="100%"
        height="480"
        style={{ border: 0, display: "block" }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </Paper>
  );
}

// ── Montavimo sistemos skirtukas ──────────────────────────────────────────────
function MountingTab({ site, siteId }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!site) return;
    const m = site.mounting ?? {};
    setForm({
      panelType: m.panelType ?? "",
      panelCount: m.panelCount != null ? String(m.panelCount) : "",
      inverterModel: m.inverterModel ?? "",
      mountingType: m.mountingType ?? "Stogo",
      installationDate: m.installationDate ?? "",
    });
  }, [site]);

  if (!form) return <Skeleton height={300} />;

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      await updateDoc(doc(db, "sites", siteId), {
        mounting: {
          panelType: form.panelType,
          panelCount: form.panelCount !== "" ? parseInt(form.panelCount, 10) : null,
          inverterModel: form.inverterModel,
          mountingType: form.mountingType,
          installationDate: form.installationDate,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const f = (field) => ({
    value: form[field],
    onChange: (e) => setForm((p) => ({ ...p, [field]: e.target.value })),
  });

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Saulės kolektoriaus tipas" placeholder="pvz. Monokristalinis 400W" fullWidth {...f("panelType")} />
          <TextField label="Kolektorių skaičius" type="number" inputProps={{ min: 1 }} fullWidth {...f("panelCount")} />
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Inverterio modelis" fullWidth {...f("inverterModel")} />
          <FormControl fullWidth>
            <InputLabel>Montavimo tipas</InputLabel>
            <Select label="Montavimo tipas" value={form.mountingType} onChange={(e) => setForm((p) => ({ ...p, mountingType: e.target.value }))}>
              {MOUNTING_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        <TextField
          label="Įrengimo data"
          type="date"
          fullWidth
          InputLabelProps={{ shrink: true }}
          {...f("installationDate")}
        />

        {saveError && <Alert severity="error">{saveError}</Alert>}
        {saved && <Alert severity="success">Sėkmingai išsaugota.</Alert>}

        <Box>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saugoma..." : "Išsaugoti pakeitimus"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}

// ── Nuotraukų skirtukas ───────────────────────────────────────────────────────
function PhotosTab({ siteId }) {
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const loadPhotos = async () => {
    setLoadingPhotos(true);
    try {
      const storageRef = ref(storage, `sites/${siteId}/photos`);
      const result = await listAll(storageRef);
      const urls = await Promise.all(
        result.items.map(async (item) => ({
          name: item.name,
          url: await getDownloadURL(item),
          ref: item,
        }))
      );
      setPhotos(urls);
    } catch (e) {
      console.error("Klaida įkeliant nuotraukas:", e);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [siteId]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setUploadError("");
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storageRef = ref(storage, `sites/${siteId}/photos/${Date.now()}_${file.name}`);
        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, file);
          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round(((i + snap.bytesTransferred / snap.totalBytes) / files.length) * 100);
              setUploadProgress(pct);
            },
            reject,
            resolve
          );
        });
      }
      await loadPhotos();
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const handleDelete = async (photo) => {
    try {
      await deleteObject(photo.ref);
      setPhotos((prev) => prev.filter((p) => p.name !== photo.name));
    } catch (e) {
      console.error("Klaida trinant nuotrauką:", e);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {photos.length} {photos.length === 1 ? "nuotrauka" : "nuotraukos"}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Įkelti nuotraukas
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Stack>

      {uploading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress variant="determinate" value={uploadProgress} />
          <Typography variant="caption" color="text.secondary">
            Įkeliama... {uploadProgress}%
          </Typography>
        </Box>
      )}

      {uploadError && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}

      {loadingPhotos ? (
        <Grid container spacing={1.5}>
          {[...Array(4)].map((_, i) => (
            <Grid item key={i} xs={6} sm={4} md={3}>
              <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
      ) : photos.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
          <Typography color="text.secondary">Nuotraukų dar nėra.</Typography>
        </Paper>
      ) : (
        <ImageList cols={4} gap={12} sx={{ mt: 0 }}>
          {photos.map((photo) => (
            <ImageListItem key={photo.name} sx={{ borderRadius: 1, overflow: "hidden" }}>
              <img
                src={photo.url}
                alt={photo.name}
                loading="lazy"
                style={{ height: 160, objectFit: "cover", width: "100%" }}
              />
              <ImageListItemBar
                actionIcon={
                  <Tooltip title="Ištrinti">
                    <IconButton
                      size="small"
                      sx={{ color: "rgba(255,255,255,0.8)" }}
                      onClick={() => handleDelete(photo)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                }
                actionPosition="right"
                title={photo.name}
                sx={{ "& .MuiImageListItemBar-title": { fontSize: "0.7rem" } }}
              />
            </ImageListItem>
          ))}
        </ImageList>
      )}
    </Box>
  );
}

// ── Puslapis ──────────────────────────────────────────────────────────────────
export default function SiteDetail() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "sites", siteId),
      (snap) => {
        setSite(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.error("SiteDetail klaida:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [siteId]);

  if (loading) {
    return (
      <Box>
        <Skeleton width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton height={300} />
      </Box>
    );
  }

  if (!site) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/sites")}>
          Objektai
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>Objektas nerastas.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Antraštė */}
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/sites")}
          sx={{ flexShrink: 0 }}
        >
          Objektai
        </Button>
        <Typography variant="h5" fontWeight={800} sx={{ flex: 1 }} noWrap>
          {site.name}
        </Typography>
        <StatusChip value={site.status} />
      </Stack>

      {/* Skirtukai */}
      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Informacija" />
          <Tab label="Žemėlapis" />
          <Tab label="Montavimo sistema" />
          <Tab label="Nuotraukos" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}>
            <InfoTab site={site} siteId={siteId} />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <MapTab site={site} />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <MountingTab site={site} siteId={siteId} />
          </TabPanel>
          <TabPanel value={tab} index={3}>
            <PhotosTab siteId={siteId} />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
