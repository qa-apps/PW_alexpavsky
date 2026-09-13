"""Executable fixture used to verify the independent merge-review providers."""


def sum_numbers(values):
    return sum(values)


if __name__ == "__main__":
    cases = [([], 0), ([1, 2], 3), ([-2, 5], 3), ([7], 7)]
    for values, expected in cases:
        actual = sum_numbers(values)
        assert actual == expected, f"expected {expected}, received {actual}"
