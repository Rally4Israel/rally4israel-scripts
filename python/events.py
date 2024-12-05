from dataclasses import dataclass


@dataclass
class Event:
    name: str
    date: str
    time: str
    location: str
