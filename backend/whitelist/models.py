from pydantic import BaseModel, validator
import ipaddress
from typing import Optional


class WhitelistEntry(BaseModel):
    type: str
    value: str
    description: str
    created: Optional[str] = None

    @validator("type")
    def validate_type(cls, v):
        valid_types = ["ip", "cidr", "domain"]
        if v not in valid_types:
            raise ValueError(f"Tipo non valido. Deve essere uno di: {valid_types}")
        return v

    @validator("value")
    def validate_value(cls, v, values):
        if "type" in values:
            entry_type = values["type"]

            if entry_type == "ip":
                try:
                    ipaddress.ip_address(v)
                except ValueError:
                    raise ValueError("Indirizzo IP non valido")

            elif entry_type == "cidr":
                try:
                    ipaddress.ip_network(v, strict=False)
                except ValueError:
                    raise ValueError("Rete CIDR non valida")

            elif entry_type == "domain":
                if not v or len(v.strip()) < 3:
                    raise ValueError("Dominio non valido")
                if not all(c.isalnum() or c in ".-_" for c in v):
                    raise ValueError("Dominio contiene caratteri non validi")

        return v
