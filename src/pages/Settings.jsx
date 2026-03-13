import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../contexts/AuthContext";
import { seedDemoData } from "../utils/seedFirestore";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lang, setLang] = useState(i18n.language || "en");

  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState(null);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    setLang(i18n.language || "en");
  }, [i18n.language]);

  const languageOptions = useMemo(
    () => [
      { value: "lt", label: "Lietuvių (LT)" },
      { value: "en", label: "English (EN)" },
    ],
    []
  );

  const onChangeLang = async (newLang) => {
    setLang(newLang);
    await i18n.changeLanguage(newLang);
    localStorage.setItem("lang", newLang);
  };

  const handleSeed = async () => {
    setSeedDialogOpen(false);
    setSeeding(true);
    setSeedMsg(null);
    try {
      const result = await seedDemoData(user.uid);
      setSeedMsg({
        type: "success",
        text: `Įkelta: ${result.techs} technikų, ${result.sites} objektų, ${result.jobs} darbų.`,
      });
    } catch (e) {
      console.error("Seed failed:", e);
      setSeedMsg({ type: "error", text: `Klaida: ${e.message}` });
    } finally {
      setSeeding(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t("pages.settings.title")}
        subtitle={t("pages.settings.subtitle")}
      />

      <Stack spacing={2}>
        {/* Language */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography fontWeight={800} sx={{ mb: 1 }}>
              {t("pages.settings.lang.title")}
            </Typography>

            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>{t("pages.settings.lang.choose")}</InputLabel>
              <Select
                label={t("pages.settings.lang.choose")}
                value={lang}
                onChange={(e) => onChangeLang(e.target.value)}
              >
                {languageOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {t("pages.settings.lang.note")}
            </Typography>
          </CardContent>
        </Card>

        {/* Account */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography fontWeight={800} sx={{ mb: 1 }}>
              {t("pages.settings.account.title")}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {t("pages.settings.account.desc")}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Button variant="contained" color="error" onClick={handleLogout}>
              {t("menu.logout")}
            </Button>
          </CardContent>
        </Card>

        {/* Demo data */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography fontWeight={800} sx={{ mb: 0.5 }}>
              {t("pages.settings.demo.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("pages.settings.demo.desc")}
            </Typography>

            {seedMsg && (
              <Alert severity={seedMsg.type} sx={{ mb: 2 }} onClose={() => setSeedMsg(null)}>
                {seedMsg.text}
              </Alert>
            )}

            <Button
              variant="outlined"
              onClick={() => setSeedDialogOpen(true)}
              disabled={seeding}
              startIcon={seeding ? <CircularProgress size={16} /> : null}
            >
              {seeding ? t("pages.settings.demo.loading") : t("pages.settings.demo.load")}
            </Button>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={seedDialogOpen} onClose={() => setSeedDialogOpen(false)}>
        <DialogTitle>{t("pages.settings.demo.confirmTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t("pages.settings.demo.confirmDesc")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeedDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSeed}>{t("pages.settings.demo.proceed")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
