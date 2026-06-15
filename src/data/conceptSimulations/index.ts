import type { ConceptSimulationDefinition } from "@/types/conceptSimulation";
import { COMMUNICATION_SIMULATIONS } from "./communication";
import { COORDINATION_SIMULATIONS } from "./coordination";
import { SCALABILITY_SIMULATIONS } from "./scalability";
import { RESILIENCY_SIMULATIONS } from "./resiliency";
import { OPERATIONS_SIMULATIONS } from "./operations";

export const CONCEPT_SIMULATIONS: ConceptSimulationDefinition[] = [
  ...COMMUNICATION_SIMULATIONS,
  ...COORDINATION_SIMULATIONS,
  ...SCALABILITY_SIMULATIONS,
  ...RESILIENCY_SIMULATIONS,
  ...OPERATIONS_SIMULATIONS,
];

const BY_ID = new Map(CONCEPT_SIMULATIONS.map((s) => [s.id, s]));

export function getConceptSimulation(id: string): ConceptSimulationDefinition | undefined {
  return BY_ID.get(id);
}

export function getConceptSimulationsForTopic(topicId: string): ConceptSimulationDefinition[] {
  return CONCEPT_SIMULATIONS.filter((s) => s.topicId === topicId);
}

export function getConceptSimulationForConcept(
  topicId: string,
  conceptId: string,
): ConceptSimulationDefinition | undefined {
  return CONCEPT_SIMULATIONS.find(
    (s) => s.topicId === topicId && s.conceptId === conceptId,
  );
}
