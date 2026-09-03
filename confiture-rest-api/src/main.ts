// FIX urgh i dont wanna fight eslint insisting this should be the last import when i need it to be first
/* eslint-disable perfectionist/sort-imports */
import "./instruments";

import type { NestExpressApplication } from "@nestjs/platform-express";
import { INestApplication, RequestMethod, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import morgan from "morgan";

import { AppModule } from "./app.module";

function configureSwagger(app: INestApplication) {
  const swaggerTitle = "API Ara";
  const swaggerDescription = `⚠️ <strong>Disclaimer</strong> : l'API d'Ara n'a pas vocation à devenir une API publique. Elle est maintenue uniquement pour les besoin du projet principal Ara (<a href="${process.env.FRONT_BASE_URL}" target="_blank">${process.env.FRONT_BASE_URL}</a>). Par conséquent, aucune garantie de stabilité n’est assurée. Des breaking changes peuvent survenir à tout moment et sans préavis.`;
  const swaggerUiOptions = {
    customSiteTitle: swaggerTitle,
    // Hide api version + improve description readability
    customCss: `
      hgroup h1 > span { display: none; }
      .swagger-ui .info p, .swagger-ui .info a { font-size: 1rem; }
      .swagger-ui .info p { line-height: 1.2; max-width:  50rem;  margin: 1rem 0; }
    `
  };

  const config = new DocumentBuilder()
    .setTitle(swaggerTitle)
    .setDescription(swaggerDescription)
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("/swagger", app, document, swaggerUiOptions);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Upsun's router sits in front of the app: trust its X-Forwarded-* headers
  // so req.ip reflects the real client IP (used by the admin IP allowlist).
  app.set("trust proxy", true);

  app.useBodyParser("json", { limit: "500kb" });
  app.use(cookieParser());
  app.use(morgan(process.env.NODE_ENV !== "production" ? "dev" : "common"));

  // "/uploads" reste hors du préfixe global : les contenus de l'éditeur
  // enregistrés en base référencent les images par <img src="/uploads/…">.
  app.setGlobalPrefix("/api", {
    exclude: [{ path: "uploads/*", method: RequestMethod.GET }]
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  configureSwagger(app);

  await app.listen(process.env.PORT || 4000);
}
bootstrap();
