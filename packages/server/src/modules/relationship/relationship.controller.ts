import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RelationshipService } from './relationship.service';
import { SendInvitationDto } from './dto/send-invitation.dto';
import { RespondInvitationDto } from './dto/respond-invitation.dto';
import { TerminateRelationshipDto } from './dto/terminate-relationship.dto';

@ApiTags('Relationships')
@Controller('relationships')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
export class RelationshipController {
  constructor(private readonly relationshipService: RelationshipService) {}

  @Post('invitations')
  @ApiOperation({
    summary: 'Envoyer une invitation pour établir une relation',
    description: 'Client → Comptable ou Comptable → Client',
  })
  async sendInvitation(@Request() req, @Body() dto: SendInvitationDto) {
    return this.relationshipService.sendInvitation(req.user.id, dto);
  }

  @Get('invitations')
  @ApiOperation({
    summary: 'Obtenir les invitations en attente (reçues et envoyées)',
  })
  async getPendingInvitations(@Request() req) {
    return this.relationshipService.getPendingInvitations(req.user.id);
  }

  @Put('invitations/:invitationId/respond')
  @ApiOperation({
    summary: 'Répondre à une invitation (accepter ou refuser)',
  })
  async respondToInvitation(
    @Request() req,
    @Param('invitationId', ParseIntPipe) invitationId: number,
    @Body() dto: RespondInvitationDto
  ) {
    return this.relationshipService.respondToInvitation(req.user.id, invitationId, dto);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Obtenir toutes les relations actives',
  })
  async getActiveRelationships(@Request() req) {
    return this.relationshipService.getActiveRelationships(req.user.id);
  }

  @Put(':relationshipId/terminate')
  @ApiOperation({
    summary: 'Résilier une relation active',
  })
  async terminateRelationship(
    @Request() req,
    @Param('relationshipId', ParseIntPipe) relationshipId: number,
    @Body() dto: TerminateRelationshipDto
  ) {
    return this.relationshipService.terminateRelationship(req.user.id, relationshipId, dto);
  }

  @Get('history')
  @ApiOperation({
    summary: "Obtenir l'historique des relations (refusées et résiliées)",
  })
  async getRelationshipHistory(@Request() req) {
    return this.relationshipService.getRelationshipHistory(req.user.id);
  }
}
