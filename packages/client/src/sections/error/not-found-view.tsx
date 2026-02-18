import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------

export function NotFoundView() {
  return (
    <Container
      sx={{
        py: 10,
        flexGrow: 1,
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography variant="h3" sx={{ mb: 2 }}>
        Désolé, page introuvable !
      </Typography>

      <Typography sx={{ color: 'text.secondary', maxWidth: 480, textAlign: 'center' }}>
        Désolé, nous n&apos;avons pas trouvé la page que vous recherchez. Peut-être avez-vous mal
        saisi l&apos;URL ? Assurez-vous de vérifier l&apos;orthographe.
      </Typography>

      <Button component={RouterLink} href="/" variant="contained" color="inherit">
        Retour à l&apos;accueil
      </Button>
    </Container>
  );
}
