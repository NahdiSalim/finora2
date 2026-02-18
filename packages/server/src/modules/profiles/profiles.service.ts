import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from 'prisma/prisma.service';
import { ApiError } from 'src/common/errors/api-error';
import { errors } from 'src/common/errors/errors';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}
  async getProfileById(profileId: number) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        profile_name: true,
        profile_name_en: true,
        tasks: {
          select: {
            task_name: true,
            task_name_en: true,
          },
        },
      },
    });

    if (!profile) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    return {
      id: profile.id,
      name: {
        fr: profile.profile_name,
        en: profile.profile_name_en,
      },
      tasks: {
        fr: profile.tasks.map((t) => t.task_name),
        en: profile.tasks.map((t) => t.task_name_en).filter(Boolean),
      },
    };
  }
  async remove(idToDelete: number) {
    // 1️⃣ Vérifier existence du profile
    const profile = await this.prisma.profile.findUnique({
      where: { id: idToDelete },
      select: {
        id: true,
        file: true,
      },
    });

    if (!profile) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode,
      );
    }

    // 2️⃣ Vérifier s’il existe une comparaison liée
    const hasProfileComparison = await this.prisma.profileComparison.findFirst({
      where: {
        OR: [
          { id_profiletocompare: idToDelete },
          { id_profilecomparedto: idToDelete },
        ],
      },
      select: { id: true },
    });

    if (hasProfileComparison) {
      throw new ApiError(
        errors.ERR_PROFILE_HAS_COMPARISON.message,
        errors.ERR_PROFILE_HAS_COMPARISON.code,
        errors.ERR_PROFILE_HAS_COMPARISON.errorCode,
      );
    }
    function resolveServerRoot(): string {
      let current = __dirname;

      // Remonter jusqu'à trouver le dossier "server"
      while (!current.endsWith(path.sep + 'server')) {
        const parent = path.dirname(current);
        if (parent === current) {
          throw new ApiError(
            errors.ERR_PROGRAM_HAS_SERVER_ROOT_NOT_FOUND.message,
            errors.ERR_PROGRAM_HAS_SERVER_ROOT_NOT_FOUND.code,
            errors.ERR_PROGRAM_HAS_SERVER_ROOT_NOT_FOUND.errorCode,
          );
        }
        current = parent;
      }

      return current;
    }

    if (profile.file) {
      // profile.file = "/uploads/1770299845321.pdf"

      // 1️⃣ nettoyer le chemin DB
      const cleanedPath = profile.file.replace(/^\/+/, '');
      // => "uploads/1770299845321.pdf"

      // 2️⃣ trouver packages/server dynamiquement
      const serverRoot = resolveServerRoot();

      // 3️⃣ chemin absolu final
      const filePath = path.join(serverRoot, cleanedPath);

      console.log('Deleting profile file:', filePath);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Profile file deleted successfully');
      } else {
        console.warn('Profile file not found:', filePath);
      }
    }

    // 4️⃣ Supprimer le profile
    await this.prisma.profile.delete({
      where: { id: idToDelete },
    });

    return {
      status: 'success',
      code: 204,
      message: 'Profile deleted successfully',
    };
  }
}
