import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import {
  ref,
  listAll,
  getDownloadURL,
  getMetadata,
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
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";

dayjs.extend(relativeTime);

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

function formatDate(val) {
  if (!val) return "—";
  try {
    const d = typeof val.toDate === "function" ? val.toDate() : new Date(val);
    return dayjs(d).format("YYYY-MM-DD HH:mm");
  } catch { return "—"; }
}

function TabPanel({ value, index, children }) {
  if (value !== index) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

// ── Informacijos skirtukas ────────────────────────────────────────────────────
function InfoTab({ job, jobId }) {
  const [technicians, setTechnicians] = useState([]);
  const [form, setForm] = useState({ status: job.status, assignedTo: job.assignedTo ?? "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, "users"), where("role", "==", "technician"), where("active", "==", true)))
      .then((snap) =>
        setTechnicians(snap.docs.map((d) => ({ uid: d.id, displayName: d.data().displayName || d.id })))
      )
      .catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const tech = technicians.find((t) => t.uid === form.assignedTo);
      await updateDoc(doc(db, "jobs", jobId), {
        status:       form.status,
        assignedTo:   form.assignedTo || null,
        assignedName: tech?.displayName || null,
        updatedAt:    new Date().toISOString().slice(0, 10),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      {/* Tik skaitoma informacija */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography fontWeight={700} sx={{ mb: 2 }}>Darbo informacija</Typography>
        <Stack spacing={1.2}>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>Pavadinimas</Typography>
            <Typography variant="body2" fontWeight={600}>{job.title}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>Objektas</Typography>
            <Typography variant="body2">{job.siteName || "—"}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>Tipas</Typography>
            <Typography variant="body2">{TYPE_LABELS[job.type] || job.type || "—"}</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>Prioritetas</Typography>
            <PriorityChip value={job.priority} />
          </Stack>
          {job.requiredLevel && (
            <Stack direction="row" spacing={1}>
              <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>Reikalingas lygis</Typography>
              <Typography variant="body2">L{job.requiredLevel}</Typography>
            </Stack>
          )}
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>Sukurta</Typography>
            <Typography variant="body2">{formatDate(job.createdAt)}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>Atnaujinta</Typography>
            <Typography variant="body2">{formatDate(job.updatedAt)}</Typography>
          </Stack>
          {job.description && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" spacing={1}>
                <Typography variant="body2" color="text.secondary" sx={{ width: 160, flexShrink: 0 }}>Aprašymas</Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{job.description}</Typography>
              </Stack>
            </>
          )}
        </Stack>
      </Paper>

      {/* Redaguojama: Statusas + Technikas */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography fontWeight={700} sx={{ mb: 2 }}>Atnaujinti darbą</Typography>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Statusas</InputLabel>
            <Select label="Statusas" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
              <MenuItem value="open">Atidarytas</MenuItem>
              <MenuItem value="in_progress">Vykdoma</MenuItem>
              <MenuItem value="resolved">Išspręsta</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Atsakingas technikas</InputLabel>
            <Select label="Atsakingas technikas" value={form.assignedTo} onChange={(e) => setForm((p) => ({ ...p, assignedTo: e.target.value }))}>
              <MenuItem value="">— Nepriskirtas —</MenuItem>
              {technicians.map((t) => (
                <MenuItem key={t.uid} value={t.uid}>{t.displayName}</MenuItem>
              ))}
            </Select>
          </FormControl>

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
    </Stack>
  );
}

// ── Priedų skirtukas ──────────────────────────────────────────────────────────
function AttachmentsTab({ jobId }) {
  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const loadFiles = async () => {
    setLoadingFiles(true);
    try {
      const storageRef = ref(storage, `jobs/${jobId}/attachments`);
      const result = await listAll(storageRef);
      const items = await Promise.all(
        result.items.map(async (item) => {
          const [url, meta] = await Promise.all([getDownloadURL(item), getMetadata(item)]);
          return {
            name: item.name,
            url,
            size: meta.size,
            contentType: meta.contentType,
            ref: item,
          };
        })
      );
      setFiles(items);
    } catch (e) {
      console.error("Klaida įkeliant priedus:", e);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => { loadFiles(); }, [jobId]);

  const handleFileChange = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setUploading(true);
    setUploadError("");
    setUploadProgress(0);

    try {
      for (let i = 0; i < selected.length; i++) {
        const file = selected[i];
        const storageRef = ref(storage, `jobs/${jobId}/attachments/${Date.now()}_${file.name}`);
        await new Promise((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, file);
          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round(((i + snap.bytesTransferred / snap.totalBytes) / selected.length) * 100);
              setUploadProgress(pct);
            },
            reject,
            resolve
          );
        });
      }
      await loadFiles();
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = "";
    }
  };

  const handleDelete = async (file) => {
    try {
      await deleteObject(file.ref);
      setFiles((prev) => prev.filter((f) => f.name !== file.name));
    } catch (e) {
      console.error("Klaida trinant priedą:", e);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const isImage = (contentType) => contentType?.startsWith("image/");

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {files.length} {files.length === 1 ? "priedas" : "priedai"}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<CloudUploadIcon />}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          Įkelti failus
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xlsx,.csv"
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

      {loadingFiles ? (
        <Stack spacing={1}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} height={56} />)}
        </Stack>
      ) : files.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, textAlign: "center" }}>
          <Typography color="text.secondary">Priedų dar nėra.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {files.map((file) => (
            <Paper
              key={file.name}
              variant="outlined"
              sx={{ p: 1.5, borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}
            >
              {isImage(file.contentType) && (
                <Box
                  component="img"
                  src={file.url}
                  alt={file.name}
                  sx={{ width: 48, height: 48, objectFit: "cover", borderRadius: 1, flexShrink: 0 }}
                />
              )}
              <Box sx={{ flex: 1, overflow: "hidden" }}>
                <Typography variant="body2" fontWeight={600} noWrap>{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {file.contentType} · {formatSize(file.size)}
                </Typography>
              </Box>
              <Tooltip title="Atsisiųsti">
                <IconButton size="small" component={Link} href={file.url} target="_blank" rel="noopener">
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Ištrinti">
                <IconButton size="small" onClick={() => handleDelete(file)} color="error">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ── Puslapis ──────────────────────────────────────────────────────────────────
export default function JobDetail() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "jobs", jobId),
      (snap) => {
        setJob(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setLoading(false);
      },
      (err) => {
        console.error("JobDetail klaida:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [jobId]);

  if (loading) {
    return (
      <Box>
        <Skeleton width={200} height={40} sx={{ mb: 2 }} />
        <Skeleton height={300} />
      </Box>
    );
  }

  if (!job) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/jobs")}>
          Darbai
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>Darbas nerastas.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Antraštė */}
      <Stack direction="row" alignItems="center" gap={1.5} sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/jobs")}
          sx={{ flexShrink: 0 }}
        >
          Darbai
        </Button>
        <Typography variant="h5" fontWeight={800} sx={{ flex: 1 }} noWrap>
          {job.title}
        </Typography>
        <PriorityChip value={job.priority} />
        <StatusChip value={job.status} />
      </Stack>

      {/* Skirtukai */}
      <Paper variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Informacija" />
          <Tab label="Priedai" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          <TabPanel value={tab} index={0}>
            <InfoTab job={job} jobId={jobId} />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <AttachmentsTab jobId={jobId} />
          </TabPanel>
        </Box>
      </Paper>
    </Box>
  );
}
