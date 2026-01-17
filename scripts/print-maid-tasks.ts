import {
  printer as ThermalPrinter,
  types as PrinterTypes,
  characterSet as CharacterSet,
} from "node-thermal-printer";
import sharp from "sharp";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const PRINTER_IP = "192.168.1.230";
const PRINTER_PORT = 9100;
const PAPER_WIDTH = 384; // 80mm paper at 203dpi
const ICON_SIZE = 48;
const SECTION_HEIGHT = 56;

// Bold, filled SVG icons optimized for thermal printing
const ICONS: Record<string, string> = {
  // Cooking pot icon for kitchen (filled, bold)
  kitchen: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <path fill="black" d="M8 1.5a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5z"/>
    <path fill="black" d="M3 7h18v2H3V7z"/>
    <path fill="black" d="M5 9h14l-1 11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 9z"/>
    <path fill="black" d="M1 8a1 1 0 0 1 1-1h1v3H2a1 1 0 0 1-1-1V8zm21-1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-1V7h1z"/>
  </svg>`,

  // Sofa icon for living areas
  living: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/><path d="M4 18v2"/><path d="M20 18v2"/></svg>`,

  // Droplets/shower icon for bathroom
  bathroom: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`,

  // Bed icon for bedroom
  bedroom: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,

  // Washing machine icon for laundry
  laundry: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2"/><circle cx="12" cy="13" r="5"/><path d="M12 10a3 3 0 0 1 3 3"/><path d="M9 6V4"/><path d="M15 6V4"/></svg>`,

  // House icon for header
  house: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
};

// Task categories with their tasks - ONLY KITCHEN FOR DEBUG
const TASKS = {
  kitchen: {
    title: "COZINHA",
    icon: "kitchen",
    tasks: [
      "Lavar a louca",
      "Limpar o fogao",
      "Organizar a geladeira",
      "Limpar o microondas",
    ],
  },
  // Uncomment these after debugging:
  // living: {
  //   title: "AREAS COMUNS",
  //   icon: "living",
  //   tasks: [
  //     "Aspirar tapetes",
  //     "Passar pano no piso",
  //     "Limpar espelhos",
  //     "Tirar o po dos moveis",
  //   ],
  // },
  // bathroom: {
  //   title: "BANHEIROS",
  //   icon: "bathroom",
  //   tasks: [
  //     "Limpar vasos sanitarios",
  //     "Limpar box e espelhos",
  //     "Trocar toalhas",
  //     "Repor papel higienico",
  //   ],
  // },
  // bedroom: {
  //   title: "QUARTOS",
  //   icon: "bedroom",
  //   tasks: [
  //     "Arrumar as camas",
  //     "Trocar roupas de cama",
  //     "Organizar guarda-roupas",
  //     "Limpar ventiladores",
  //   ],
  // },
  // laundry: {
  //   title: "LAVANDERIA",
  //   icon: "laundry",
  //   tasks: ["Lavar roupas", "Passar roupas", "Organizar armario"],
  // },
};

// Portuguese weekday names
const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terca-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sabado",
];

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

async function generateSectionHeader(
  iconSvg: string,
  title: string,
  outputPath: string
): Promise<void> {
  // Create a composite SVG with icon on the left and text on the right
  const compositeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PAPER_WIDTH}" height="${SECTION_HEIGHT}" viewBox="0 0 ${PAPER_WIDTH} ${SECTION_HEIGHT}">
    <rect fill="white" width="${PAPER_WIDTH}" height="${SECTION_HEIGHT}"/>

    <!-- Icon container (scaled up from 24x24 to ${ICON_SIZE}x${ICON_SIZE}) -->
    <g transform="translate(8, ${(SECTION_HEIGHT - ICON_SIZE) / 2}) scale(${ICON_SIZE / 24})">
      ${iconSvg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
    </g>

    <!-- Title text -->
    <text x="${ICON_SIZE + 20}" y="${SECTION_HEIGHT / 2 + 8}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" fill="black">${title}</text>

    <!-- Separator line -->
    <line x1="${ICON_SIZE + 20}" y1="${SECTION_HEIGHT - 4}" x2="${PAPER_WIDTH - 10}" y2="${SECTION_HEIGHT - 4}" stroke="black" stroke-width="2"/>
  </svg>`;

  const buffer = Buffer.from(compositeSvg);
  await sharp(buffer).png().toFile(outputPath);
}

async function generateHeader(outputPath: string): Promise<void> {
  const houseSvg = ICONS.house;
  const headerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PAPER_WIDTH} 90" width="${PAPER_WIDTH}" height="90">
    <rect fill="white" width="${PAPER_WIDTH}" height="90"/>

    <!-- Top decorative border -->
    <rect fill="black" x="0" y="0" width="${PAPER_WIDTH}" height="3"/>
    <rect fill="black" x="0" y="6" width="${PAPER_WIDTH}" height="1"/>

    <!-- House icon (centered, scaled up) -->
    <g transform="translate(${PAPER_WIDTH / 2 - 20}, 12) scale(1.7)">
      ${houseSvg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}
    </g>

    <!-- Title text -->
    <text x="${PAPER_WIDTH / 2}" y="72" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="bold" text-anchor="middle" fill="black">TAREFAS DO DIA</text>

    <!-- Bottom decorative border -->
    <rect fill="black" x="0" y="83" width="${PAPER_WIDTH}" height="1"/>
    <rect fill="black" x="0" y="87" width="${PAPER_WIDTH}" height="3"/>
  </svg>`;

  const buffer = Buffer.from(headerSvg);
  await sharp(buffer).png().toFile(outputPath);
}

async function generateAssets(): Promise<string> {
  const tempDir = path.join(os.tmpdir(), "maid-tasks-assets");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Generate header
  await generateHeader(path.join(tempDir, "header.png"));

  // Generate section headers (icon + title combined)
  for (const [key, category] of Object.entries(TASKS)) {
    const iconSvg = ICONS[category.icon];
    await generateSectionHeader(
      iconSvg,
      category.title,
      path.join(tempDir, `section-${key}.png`)
    );
  }

  console.log(`Assets generated in: ${tempDir}`);
  return tempDir;
}

function formatDate(): string {
  const now = new Date();
  const weekday = WEEKDAYS[now.getDay()];
  const day = now.getDate();
  const month = MONTHS[now.getMonth()];
  const year = now.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

async function printTasks(): Promise<void> {
  console.log("Generating assets...");
  const assetsDir = await generateAssets();

  console.log(`Connecting to printer at ${PRINTER_IP}:${PRINTER_PORT}...`);

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: `tcp://${PRINTER_IP}:${PRINTER_PORT}`,
    options: {
      timeout: 5000,
    },
    width: 48, // characters per line for 80mm paper
    characterSet: CharacterSet.PC860_PORTUGUESE,
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    throw new Error(
      `Could not connect to printer at ${PRINTER_IP}:${PRINTER_PORT}`
    );
  }

  console.log("Printer connected! Printing...");

  // Initialize printer
  printer.clear();
  printer.alignCenter();

  // Print header image
  await printer.printImage(path.join(assetsDir, "header.png"));
  printer.newLine();

  // Print date
  printer.setTextDoubleHeight();
  printer.println(formatDate());
  printer.setTextNormal();
  printer.newLine();

  // Print greeting
  printer.alignLeft();
  printer.println("  Bom dia! Aqui estao as tarefas");
  printer.println("  de hoje:");
  printer.newLine();

  // Print each category
  for (const [key, category] of Object.entries(TASKS)) {
    // Print section header image (icon + title combined)
    const sectionPath = path.join(assetsDir, `section-${key}.png`);
    await printer.printImage(sectionPath);

    // Print tasks with ASCII checkboxes
    for (const task of category.tasks) {
      printer.println(`  [ ] ${task}`);
    }

    printer.newLine();
  }

  // Print footer
  printer.alignCenter();
  printer.drawLine();
  printer.newLine();
  printer.bold(true);
  printer.println("Obrigado pelo seu trabalho!");
  printer.bold(false);
  printer.newLine();
  printer.drawLine();

  // Cut paper
  printer.newLine();
  printer.newLine();
  printer.cut();

  // Execute print
  try {
    await printer.execute();
    console.log("Print job completed successfully!");
  } catch (error) {
    console.error("Error printing:", error);
    throw error;
  }
}

// Main execution
printTasks()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to print tasks:", error);
    process.exit(1);
  });
