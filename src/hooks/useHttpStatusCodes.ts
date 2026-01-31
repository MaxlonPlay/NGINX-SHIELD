import { useMemo } from "react";

export interface HttpStatusCode {
  code: number;
  description: string;
  risk: 1 | 2 | 3;
}

const ALL_HTTP_CODES: HttpStatusCode[] = [
  { code: 100, description: "Continua", risk: 1 },
  { code: 101, description: "Cambio di protocollo", risk: 2 },
  { code: 102, description: "Elaborazione (WebDAV)", risk: 2 },
  { code: 103, description: "Suggerimenti iniziali", risk: 2 },

  { code: 200, description: "OK", risk: 1 },
  { code: 201, description: "Creato", risk: 1 },
  { code: 202, description: "Accettato", risk: 1 },
  { code: 203, description: "Informazioni non autorevoli", risk: 2 },
  { code: 204, description: "Nessun contenuto", risk: 1 },
  { code: 205, description: "Reimposta contenuto", risk: 1 },
  { code: 206, description: "Contenuto parziale", risk: 2 },
  { code: 207, description: "Multi-Status (WebDAV)", risk: 2 },
  { code: 208, description: "Già segnalato (WebDAV)", risk: 2 },
  { code: 226, description: "IM Usato", risk: 2 },

  { code: 300, description: "Scelte multiple", risk: 2 },
  { code: 301, description: "Spostato in modo permanente", risk: 2 },
  { code: 302, description: "Trovato (Redirect)", risk: 3 },
  { code: 303, description: "Vedi Altro", risk: 2 },
  { code: 304, description: "Non modificato", risk: 1 },
  { code: 305, description: "Usa proxy", risk: 3 },
  { code: 306, description: "(Non usato)", risk: 2 },
  { code: 307, description: "Reindirizzamento temporaneo", risk: 2 },
  { code: 308, description: "Reindirizzamento permanente", risk: 2 },

  { code: 400, description: "Richiesta non valida", risk: 3 },
  { code: 401, description: "Non autorizzato", risk: 3 },
  { code: 402, description: "Pagamento richiesto", risk: 2 },
  { code: 403, description: "Accesso negato", risk: 3 },
  { code: 404, description: "Non trovato", risk: 3 },
  { code: 405, description: "Metodo non consentito", risk: 3 },
  { code: 406, description: "Non accettabile", risk: 2 },
  { code: 407, description: "Autenticazione proxy richiesta", risk: 3 },
  { code: 408, description: "Timeout richiesta", risk: 2 },
  { code: 409, description: "Conflitto", risk: 2 },
  { code: 410, description: "Non disponibile", risk: 2 },
  { code: 411, description: "Lunghezza richiesta", risk: 2 },
  { code: 412, description: "Precondizione fallita", risk: 2 },
  { code: 413, description: "Carico utile troppo grande", risk: 2 },
  { code: 414, description: "URI troppo lungo", risk: 2 },
  { code: 415, description: "Tipo di media non supportato", risk: 2 },
  { code: 416, description: "Intervallo non soddisfacibile", risk: 2 },
  { code: 417, description: "Aspettativa fallita", risk: 2 },
  { code: 418, description: "Sono una teiera (RFC 2324)", risk: 1 },
  { code: 421, description: "Richiesta indirizzata in modo errato", risk: 2 },
  { code: 422, description: "Entità non elaborabile (WebDAV)", risk: 2 },
  { code: 423, description: "Bloccato (WebDAV)", risk: 2 },
  { code: 424, description: "Dipendenza fallita (WebDAV)", risk: 2 },
  { code: 425, description: "Troppo presto", risk: 2 },
  { code: 426, description: "Aggiornamento richiesto", risk: 2 },
  { code: 428, description: "Precondizione richiesta", risk: 2 },
  { code: 429, description: "Troppe richieste", risk: 2 },
  { code: 431, description: "Campi header troppo grandi", risk: 2 },
  { code: 451, description: "Non disponibile per motivi legali", risk: 2 },
  { code: 499, description: "Richiesta chiusa dal client (Nginx)", risk: 2 },

  { code: 500, description: "Errore interno del server", risk: 3 },
  { code: 501, description: "Non implementato", risk: 3 },
  { code: 502, description: "Bad Gateway", risk: 3 },
  { code: 503, description: "Servizio non disponibile", risk: 3 },
  { code: 504, description: "Timeout del gateway", risk: 3 },
  { code: 505, description: "Versione HTTP non supportata", risk: 3 },
  { code: 506, description: "Variante negoziata anche", risk: 2 },
  { code: 507, description: "Spazio insufficiente (WebDAV)", risk: 2 },
  { code: 508, description: "Loop rilevato (WebDAV)", risk: 2 },
  { code: 510, description: "Non esteso", risk: 2 },
  { code: 511, description: "Autenticazione di rete richiesta", risk: 3 },
];

export const useHttpStatusCodes = () => {
  const lowCriticalityCodes = useMemo(
    () => ALL_HTTP_CODES.filter((item) => item.risk === 1),
    [],
  );

  const mediumCriticalityCodes = useMemo(
    () => ALL_HTTP_CODES.filter((item) => item.risk === 2),
    [],
  );

  const highCriticalityCodes = useMemo(
    () => ALL_HTTP_CODES.filter((item) => item.risk === 3),
    [],
  );

  return {
    ALL_HTTP_CODES,
    lowCriticalityCodes,
    mediumCriticalityCodes,
    highCriticalityCodes,
  };
};
