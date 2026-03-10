import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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

  @Get('clients/invoice-stats')
  @ApiOperation({
    summary: 'Obtenir tous les clients avec leurs statistiques de factures (pour comptables)',
    description:
      'Retourne la liste des clients avec logo, nom, prénom, email et nombre de factures (traite/pending)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @Get('clients/invoice-stats')
  @ApiOperation({
    summary: 'Obtenir tous les clients avec leurs statistiques de factures (pour comptables)',
    description:
      'Retourne la liste des clients avec logo, nom, prénom, email et nombre de factures (traite/pending)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by company name',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Filter by start date (ISO format: YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Filter by end date (ISO format: YYYY-MM-DD)',
  })
  async getClientsWithInvoiceStats(
    @Request() req,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.relationshipService.getClientsWithInvoiceStats(
      req.user.id,
      page || 1,
      limit || 20,
      search,
      startDate,
      endDate
    );
  }
}
