import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import { useRouter } from 'src/routes/hooks';

export default function PageForbidden() {
  const router = useRouter();

  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="h1"
          sx={{
            mb: 2,
            fontSize: { xs: '4rem', md: '6rem' },
            fontWeight: 'bold',
            color: 'error.main',
          }}
        >
          403
        </Typography>

        <Typography variant="h4" sx={{ mb: 2, fontWeight: 'medium' }}>
          Accès Refusé
        </Typography>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 480 }}>
          Désolé, vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
          Veuillez contacter votre administrateur si vous pensez qu&apos;il s&apos;agit d&apos;une
          erreur.
        </Typography>

        <Button
          variant="contained"
          size="large"
          onClick={() => router.push('/')}
          sx={{ minWidth: 200 }}
        >
          Retour à l&apos;accueil
        </Button>
      </Box>
    </Container>
  );
}
