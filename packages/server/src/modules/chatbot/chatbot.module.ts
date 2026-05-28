import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotImageProxyController } from './chatbot-image-proxy.controller';
import { ChatbotService } from './chatbot.service';
import { AiInsightsService } from './ai-insights.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MinioService } from '../../common/services/minio.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ChatbotController, ChatbotImageProxyController],
  providers: [ChatbotService, AiInsightsService, MinioService],
  exports: [AiInsightsService],
})
export class ChatbotModule {}
