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

  // Seed state
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState(null); // { type: "success"|"error", text: string }

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
        title={t("menu.settings")}
        subtitle="Sistemos nustatymai (kalba, profilis ir kt.)"
      />

      <Stack spacing={2}>
        {/* Language */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography fontWeight={800} sx={{ mb: 1 }}>
              Kalba / Language
            </Typography>

            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel>Pasirinkti kalbą</InputLabel>
              <Select
                label="Pasirinkti kalbą"
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
              Pasirinkimas išsaugomas naršyklėje (localStorage) ir bus pritaikomas
              kitą kartą atidarius puslapį.
            </Typography>
          </CardContent>
        </Card>

        {/* Account */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
            <Typography fontWeight={800} sx={{ mb: 1 }}>
              Paskyra
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Čia vėliau galėsi rodyti admin el. paštą ir kitą profilio informaciją.
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
              Demo duomenys
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Užpildo Firestore demonstraciniais duomenimis: 5 technikais, 4 objektais
              ir 8 darbais. Galima paleisti kelis kartus — perrašo esamus įrašus.
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
              {seeding ? "Įkeliama..." : "Įkelti demo duomenis"}
            </Button>
          </CardContent>
        </Card>
      </Stack>

      {/* Confirmation dialog */}
      <Dialog open={seedDialogOpen} onClose={() => setSeedDialogOpen(false)}>
        <DialogTitle>Įkelti demo duomenis?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tai įrašys į Firestore 5 technikus, 4 objektus ir 8 darbus.
            Esami įrašai su tais pačiais ID bus perrašyti.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSeedDialogOpen(false)}>Atšaukti</Button>
          <Button variant="contained" onClick={handleSeed}>Tęsti</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
