import { Box, Typography } from "@mui/material";

export default function NotFound() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700}>
        404
      </Typography>
      <Typography>Puslapis nerastas.</Typography>
    </Box>
  );
}