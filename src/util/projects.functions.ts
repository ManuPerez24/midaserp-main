import { createServerFn } from "@tanstack/react-start";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { z } from "zod";

// Generador de IDs únicos simple para no depender de librerías extra en el servidor
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

export const uploadProjectFiles = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      files: z.array(z.object({ name: z.string(), base64: z.string(), type: z.string(), size: z.number().optional() })),
    }).parse,
  )
  .handler(async ({ data }) => {
    const uploadedFiles: any[] = [];
    
    // Guardar en la carpeta public/uploads/proyectos de la raíz del proyecto
    const uploadDir = join(process.cwd(), "public", "uploads", "proyectos");

    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (e) {
      // Ignorar silenciosamente si el directorio ya existe
    }

    for (const file of data.files) {
      const ext = file.name.split(".").pop() || "bin";
      const fileName = `${generateId()}.${ext}`;
      const filePath = join(uploadDir, fileName);

      const base64Data = file.base64.substring(file.base64.indexOf(',') + 1);
      const buffer = Buffer.from(base64Data, "base64");

      // Escribir el archivo físico en el disco duro
      await writeFile(filePath, buffer);
      
      uploadedFiles.push({
         id: generateId(),
         name: file.name,
         type: file.type,
         url: `/uploads/proyectos/${fileName}`,
         createdAt: new Date().toISOString(),
         size: buffer.length
      });
    }

    return { ok: true, data: uploadedFiles };
  }
);