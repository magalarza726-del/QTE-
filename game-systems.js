(() => {
  "use strict";

  const ANIMATIONS = window.QTEAnimations;

  const DEFAULT_BUTTONS = ["UP", "DOWN", "LEFT", "RIGHT", "A", "B", "X", "Y", "L1", "R1", "L2", "R2"];
  const DEFAULT_LABELS = {UP:"↑",DOWN:"↓",LEFT:"←",RIGHT:"→",A:"A",B:"B",X:"X",Y:"Y",L1:"L1",R1:"R1",L2:"L2",R2:"R2"};

  const ButtonRegistry = {
    buttons: [...DEFAULT_BUTTONS],
    labels: {...DEFAULT_LABELS},
    register(id, label=id) {
      const key = String(id || "").trim().toUpperCase();
      if (!key) throw new Error("El botón necesita un identificador.");
      if (!this.buttons.includes(key)) this.buttons.push(key);
      this.labels[key] = String(label || key);
      return key;
    },
    has(id) { return this.buttons.includes(String(id || "").toUpperCase()); },
    label(id) { return this.labels[id] || id; }
  };

  const FormulaRegistry = {
    formulas: new Map(),
    register(name, fn) {
      if (typeof fn !== "function") throw new TypeError(`La fórmula ${name} debe ser una función.`);
      this.formulas.set(name, fn);
    },
    calculate(name, ...args) {
      const formula = this.formulas.get(name);
      if (!formula) throw new Error(`Fórmula no registrada: ${name}`);
      return formula(...args);
    }
  };

  const totalButtons = card => (card?.secciones || []).reduce((sum, section) => sum + (section.botones || []).length, 0);
  const totalTime = card => (card?.secciones || []).reduce((sum, section) => sum + Number(section.tiempo || 0), 0);
  const flattenButtons = card => (card?.secciones || []).flatMap(section => (section.botones || []).map(value => typeof value === "string" ? value : value?.button || value?.boton || ""));

  FormulaRegistry.register("poderBruto", card => {
    const time = totalTime(card);
    return time > 0 ? totalButtons(card) / time : 0;
  });

  FormulaRegistry.register("coeficienteVariacion", card => {
    const buttons = flattenButtons(card).filter(Boolean);
    const N = buttons.length;
    if (!N) return 0;
    const counts = buttons.reduce((map, button) => {
      map[button] = (map[button] || 0) + 1;
      return map;
    }, {});
    const sumSquares = Object.values(counts).reduce((sum, count) => sum + count ** 2, 0);
    return sumSquares > 0 ? Math.sqrt((N ** 2) / sumSquares) / 10 : 0;
  });

  FormulaRegistry.register("poderNeto", (correctos, tiempoReal, coeficiente) => {
    const time = Number(tiempoReal || 0);
    return time > 0 ? (Number(correctos || 0) / time) * (1 + Number(coeficiente || 0)) : 0;
  });

  FormulaRegistry.register("precision", (correctos, total) => total > 0 ? Math.max(0, Math.min(100, Number(correctos || 0) / Number(total) * 100)) : 0);

  function slug(value) {
    return String(value || "carta")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "carta";
  }

  function defaultStats(source={}) {
    return {
      usos: Number(source.usos || 0),
      victorias: Number(source.victorias || 0),
      derrotas: Number(source.derrotas || 0),
      dano_promedio: Number(source.dano_promedio ?? source.daño_promedio ?? 0),
      tiempo_medio: Number(source.tiempo_medio ?? source.tiempo_promedio ?? 0),
      precision_media: Number(source.precision_media ?? source.precision_promedio ?? 0),
      mejor_poder_neto: Number(source.mejor_poder_neto || 0),
      mayor_racha_perfecta: Number(source.mayor_racha_perfecta || 0),
      racha_perfecta_actual: Number(source.racha_perfecta_actual || 0)
    };
  }

  const CardSchema = {
    normalize(card, index=0) {
      const normalized = {
        ...card,
        id: card?.id || `card-${slug(card?.nombre)}-${index + 1}`,
        nombre: String(card?.nombre || `Carta ${index + 1}`),
        secciones: Array.isArray(card?.secciones) ? card.secciones.map((section, sectionIndex) => ({
          ...section,
          nombre: String(section?.nombre || `Sección ${sectionIndex + 1}`),
          tiempo: Number(section?.tiempo || 0),
          botones: Array.isArray(section?.botones) ? section.botones.map(value => typeof value === "string" ? value : String(value?.button ?? value?.boton ?? "")) : []
        })) : [],
        imageId: card?.imageId || null,
        animation: ANIMATIONS ? ANIMATIONS.normalize(card?.animation, index) : (card?.animation || null),
        estadisticas: defaultStats(card?.estadisticas)
      };
      normalized.poder_bruto = Number(FormulaRegistry.calculate("poderBruto", normalized).toFixed(8));
      normalized.coeficiente = Number(FormulaRegistry.calculate("coeficienteVariacion", normalized).toFixed(8));
      return normalized;
    },
    normalizeAll(cards) {
      return Array.isArray(cards) ? cards.map((card, index) => this.normalize(card, index)) : [];
    },
    refreshComputed(card) {
      card.poder_bruto = Number(FormulaRegistry.calculate("poderBruto", card).toFixed(8));
      card.coeficiente = Number(FormulaRegistry.calculate("coeficienteVariacion", card).toFixed(8));
      if (ANIMATIONS) card.animation = ANIMATIONS.normalize(card.animation);
      card.estadisticas = defaultStats(card.estadisticas);
      return card;
    },
    newCardId(name="nueva-carta") {
      return `card-${slug(name)}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    },
    defaultStats
  };

  const StatsManager = {
    recordExecution(card, result, effectiveDamage=0) {
      if (!card) return;
      const stats = card.estadisticas = defaultStats(card.estadisticas);
      const previousUses = stats.usos;
      const newUses = previousUses + 1;
      const avg = (oldValue, newValue) => ((Number(oldValue || 0) * previousUses) + Number(newValue || 0)) / newUses;
      stats.usos = newUses;
      stats.dano_promedio = avg(stats.dano_promedio, effectiveDamage);
      stats.tiempo_medio = avg(stats.tiempo_medio, result?.realTime || 0);
      stats.precision_media = avg(stats.precision_media, result?.accuracy || 0);
      stats.mejor_poder_neto = Math.max(stats.mejor_poder_neto, Number(result?.netPower || 0));
      const perfect = Number(result?.correct || 0) === Number(result?.total || 0)
        && Number(result?.incorrect || 0) === 0
        && Number(result?.missed || 0) === 0;
      stats.racha_perfecta_actual = perfect ? stats.racha_perfecta_actual + 1 : 0;
      stats.mayor_racha_perfecta = Math.max(stats.mayor_racha_perfecta, stats.racha_perfecta_actual);
    },
    recordMatch(cards, outcome) {
      const unique = new Map((cards || []).filter(Boolean).map(card => [card.id || card.nombre, card]));
      unique.forEach(card => {
        const stats = card.estadisticas = defaultStats(card.estadisticas);
        if (outcome === "victoria") stats.victorias += 1;
        if (outcome === "derrota") stats.derrotas += 1;
      });
    }
  };

  window.QTEGameSystems = {
    ButtonRegistry,
    FormulaRegistry,
    CardSchema,
    StatsManager,
    helpers: {totalButtons, totalTime, flattenButtons},
    AnimationSchema: ANIMATIONS ? {normalize: ANIMATIONS.normalize, types: ANIMATIONS.TYPES} : null
  };
})();
