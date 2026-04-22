import { PartialType } from '@nestjs/swagger';
import { CreateBonLivraisonDto } from './create-bon-livraison.dto';

export class UpdateBonLivraisonDto extends PartialType(CreateBonLivraisonDto) {}
