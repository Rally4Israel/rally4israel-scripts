from r4ilpy.image_generators import IntroImageGenerator


def test_saves_image_in_directory_based_on_batch_number(tmp_path):
    generator = IntroImageGenerator(path=str(tmp_path) + "/", batch_no=1)
    generator.generate()

    expected_filepath = tmp_path / "batches/1/intro_image.jpg"

    assert expected_filepath.exists()
    assert expected_filepath.is_file()
