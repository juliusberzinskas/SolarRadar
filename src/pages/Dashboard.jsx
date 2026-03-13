import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/lt";
import {
  Box,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate";
import SyncIcon from "@mui/icons-material/Sync";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SolarPowerIcon from "@mui/icons-material/SolarPower";
import PageHeader from "../components/PageHeader";

dayjs.extend(relativeTime);

function formatAgo(val, locale) {
  if (!val) return "—";
  try {
    const date = typeof val.toDate === "function" ? val.toDate() : new Date(val);
    return dayjs(date).locale(locale).fromNow();
  } catch {
    return "—";
  }
}

function StatusChip({ value }) {
  const { t } = useTranslation();
  const cfg = {
    open:        { key: "status.open",        color: "warning" },
    in_progress: { key: "status.in_progress", color: "info"    },
    resolved:    { key: "status.resolved",    color: "success" },
  };
  const c = cfg[value] || { key: value, color: "default" };
  return <Chip size="small" label={t(c.key, c.key)} color={c.color} variant="outlined" />;
}

function PriorityChip({ value }) {
  const { t } = useTranslation();
  const cfg = {
    low:    { key: "priority.low",    color: "default" },
    medium: { key: "priority.medium", color: "info"    },
    high:   { key: "priority.high",   color: "error"   },
  };
  const c = cfg[value] || { key: value, color: "default" };
  return <Chip size="small" label={t(c.key, c.key)} color={c.color} variant="outlined" />;
}

function KpiCard({ label, count, icon, accentColor, loading }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        borderLeft: `4px solid ${accentColor}`,
        display: "flex",
        alignItems: "center",
        gap: 2,
        bgcolor: "background.paper",
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: 2,
          bgcolor: `${accentColor}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accentColor,
          flexShrink: 0,
          fontSize: 28,
        }}
      >
        {icon}
      </Box>
      <Box>
        {loading ? (
          <Skeleton width={48} height={44} />
        ) : (
          <Typography variant="h4" fontWeight={800} lineHeight={1}>
            {count}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "lt" ? "lt" : "en";

  const [jobs, setJobs] = useState([]);
  const [sitesCount, setSitesCount] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingSites, setLoadingSites] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "jobs"),
      (snap) => {
        setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingJobs(false);
      },
      (err) => { console.error("Dashboard jobs error:", err); setLoadingJobs(false); }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "sites"),
      (snap) => { setSitesCount(snap.size); setLoadingSites(false); },
      (err) => { console.error("Dashboard sites error:", err); setLoadingSites(false); }
    );
    return () => unsub();
  }, []);

  const openCount       = useMemo(() => jobs.filter((j) => j.status === "open").length, [jobs]);
  const inProgressCount = useMemo(() => jobs.filter((j) => j.status === "in_progress").length, [jobs]);
  const resolvedCount   = useMemo(() => jobs.filter((j) => j.status === "resolved").length, [jobs]);

  const recentJobs = useMemo(() => {
    return [...jobs]
      .sort((a, b) => {
        const aMs = a.createdAt?.toDate?.()?.getTime() ?? 0;
        const bMs = b.createdAt?.toDate?.()?.getTime() ?? 0;
        return bMs - aMs;
      })
      .slice(0, 6);
  }, [jobs]);

  const loading = loadingJobs || loadingSites;

  return (
    <Box>
      <PageHeader
        title={t("pages.dashboard.title")}
        subtitle={t("pages.dashboard.subtitle")}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label={t("pages.dashboard.kpi.open")} count={openCount} icon={<AssignmentLateIcon fontSize="inherit" />} accentColor="#f59e0b" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label={t("pages.dashboard.kpi.inProgress")} count={inProgressCount} icon={<SyncIcon fontSize="inherit" />} accentColor="#3b82f6" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label={t("pages.dashboard.kpi.resolved")} count={resolvedCount} icon={<CheckCircleOutlineIcon fontSize="inherit" />} accentColor="#22c55e" loading={loading} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label={t("pages.dashboard.kpi.activeSites")} count={sitesCount} icon={<SolarPowerIcon fontSize="inherit" />} accentColor="#a855f7" loading={loading} />
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Box sx={{ px: 2.5, py: 1.8 }}>
          <Typography fontWeight={700} fontSize="0.95rem">
            {t("pages.dashboard.recentJobs")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("pages.dashboard.recentJobsCaption", { count: recentJobs.length })}
          </Typography>
        </Box>
        <Divider />

        {loadingJobs ? (
          <Box sx={{ p: 2 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
            ))}
          </Box>
        ) : recentJobs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="text.secondary">{t("pages.dashboard.noJobs")}</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {recentJobs.map((job, idx) => (
              <Box key={job.id}>
                <ListItem
                  sx={{ px: 2.5, py: 1.4 }}
                  secondaryAction={
                    <Stack direction="row" spacing={0.8} alignItems="center">
                      <PriorityChip value={job.priority} />
                      <StatusChip value={job.status} />
                    </Stack>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography fontWeight={600} fontSize="0.9rem" noWrap sx={{ maxWidth: 340 }}>
                        {job.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {job.siteName || "—"} · {formatAgo(job.createdAt, locale)}
                      </Typography>
                    }
                  />
                </ListItem>
                {idx < recentJobs.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}
