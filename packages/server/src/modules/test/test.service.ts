import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TestService {
  constructor(private prisma: PrismaService) {}
  async findAll() {
    const test = await this.prisma.test.findMany();
    return test;
  }
}
